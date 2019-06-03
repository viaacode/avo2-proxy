import { Filters, SearchOrderProperty, SearchOrderDirection, SearchRequest, FilterOptionSearch } from './types';
import * as _ from 'lodash';
import * as textQueryObjectTemplateImport from './elasticsearch-templates/text-query-object.json';
import { RecursiveError } from '../../helpers/recursiveError';

delete (textQueryObjectTemplateImport as any).default; // https://github.com/Microsoft/TypeScript/issues/24588
const textQueryObjectTemplate = _.values(textQueryObjectTemplateImport);

const escapeElastic = require('elasticsearch-sanitize');

type FilterProperty = keyof Filters;
export const READABLE_TO_ELASTIC_FILTER_NAMES: { [prop in FilterProperty]: string } = {
	query: 'query',
	type: 'administrative_type',
	educationLevel: 'lom_typical_age_range',
	domain: 'lom_context',
	broadcastDate: 'dcterms_issued',
	language: 'lom_languages',
	keyword: 'lom_keywords',
	subject: 'lom_classification',
	serie: 'dc_titles_serie',
	provider: 'original_cp',
};

export const ELASTIC_TO_READABLE_FILTER_NAMES = _.invert(READABLE_TO_ELASTIC_FILTER_NAMES);

const aggsProperties: (keyof Filters)[] = [
	'type',
	'educationLevel',
	'domain',
	'language',
	'keyword',
	'subject',
	'serie',
	'provider',
];

const NEEDS_FILTER_SUFFIX: { [prop in FilterProperty]: boolean } = {
	query: false,
	type: true,
	educationLevel: true,
	domain: true,
	broadcastDate: true,
	language: false,
	keyword: true,
	subject: true,
	serie: true,
	provider: true,
};

const NUMBER_OF_FILTER_OPTIONS = 50;

export default class QueryBuilder {
	private static readonly orderMappings: { [prop: string]: any } = {
		relevance: '_score',
		views: 'view_count', // TODO replace key with actual key when available in elasticsearch
		broadcastDate: 'dcterms_issued',
		createdDate: 'created_date', // TODO replace key with actual key when available in elasticsearch
		lastEditDate: 'last_edit_date', // TODO replace key with actual key when available in elasticsearch
	};

	/**
	 * Convert filters, order, aggs properties (created by the ui) to elasticsearch query object
	 * @param searchRequest
	 */
	public static buildSearchObject(searchRequest: SearchRequest): any {
		try {
			const queryObject: any = {};
			delete queryObject.default; // Side effect of importing a json file as a module

			queryObject.from = searchRequest.from || 0;
			queryObject.size = Math.min(searchRequest.size || 30, 2000); // Avoid huge queries

			// Provide the ordering to the query object
			_.set(queryObject, 'sort', this.buildSortArray(searchRequest.orderProperty, searchRequest.orderDirection));

			// Add the filters and search terms to the query object
			_.set(queryObject, 'query', this.buildFilterObject(searchRequest.filters));

			// Specify the aggs objects with optional search terms
			_.set(queryObject, 'aggs', this.buildAggsObject(searchRequest.filterOptionSearch));

			return queryObject;
		} catch (err) {
			throw new RecursiveError(
				'Failed to build query object',
				err,
				{
					...searchRequest,
				},
			);
		}
	}

	/**
	 * Converts a sort property and direction to an elasticsearch sort array
	 * eg:
	 *     orderProperty: 'broadcastDate',
	 *     orderDirection: 'asc'
	 * is converted into:
	 *     [
	 *        {
	 *     			"dcterms_issued": {
	 *     				"order": "asc"
	 *     			}
	 *     		},
	 *        "_score"
	 *     ]
	 * @param orderProperty
	 * @param orderDirection
	 */
	private static buildSortArray(
		orderProperty: SearchOrderProperty | undefined = 'relevance',
		orderDirection: SearchOrderDirection | undefined = 'desc') {
		const mappedOrderProperty = this.orderMappings[orderProperty];
		const sortArray: any[] = [];
		if (mappedOrderProperty !== '_score') {
			const sortItem: any = {};
			sortItem[mappedOrderProperty] = {
				order: orderDirection,
			};
			sortArray.push(sortItem);
		}
		// Always order by relevance if 2 search items have identical primary sort values
		sortArray.push('_score');
		return sortArray;
	}

	/**
	 * Creates the filter portion of the elsaticsearch query object
	 * Containing the search terms and the checked filters
	 * @param filters
	 */
	private static buildFilterObject(filters: Partial<Filters> | undefined) {
		if (!filters || _.isEmpty(filters)) {
			// Return query object that will match all results
			return { match_all: {} };
		}

		const filterObject: any = {};
		const stringQuery = _.get(filters, 'query');
		if (stringQuery) {
			// Replace {{query}} in the template with the escaped search terms
			const textQueryObjectArray = _.cloneDeep(textQueryObjectTemplate);
			const escapedQueryString = escapeElastic(stringQuery); // Avoid elasticsearch injection attacks
			_.forEach(textQueryObjectArray, (matchObj) => {
				_.set(matchObj, 'multi_match.query', escapedQueryString);
			});

			if (_.keys(filters).length === 1) {
				// Only a string query is passed, no need to add further filters
				_.set(filterObject, 'bool.should', textQueryObjectArray);
				return filterObject;
			}
		}

		// Add additional filters to the query object
		const filterArray: any[] = [];
		_.set(filterObject, 'bool.filter', filterArray);
		_.forEach(filters, (value: any, readableKey: string) => {
			if (readableKey === 'query') {
				return; // Query filter has already been handled, skip this foreach iteration
			}

			// Map frontend filter names to elasticsearch names
			const elasticKey = READABLE_TO_ELASTIC_FILTER_NAMES[readableKey];
			if (!elasticKey) {
				throw new RecursiveError(`Failed to resolve agg property: ${readableKey}`);
			}
			if (_.isArray(value) && _.every(value, (val) => _.isString(val))) {
				// Array of options
				// TODO if only one option use "term" instead of "terms" (better efficiency for elasticsearch)
				filterArray.push({
					terms: {
						[elasticKey + this.suffix(readableKey as keyof Filters)]: value,
					},
				});
			} else if (_.isObject(value) && (!_.isNil(value['gte']) || !_.isNil(value['lte']))) {
				// Date/number interval
				const intervalValue = value as { gte?: string | number, lte?: string | number };
				filterArray.push({
					range: {
						[elasticKey]: {
							...((!_.isNil(intervalValue.gte)) && { gte: intervalValue.gte }),
							...((!_.isNil(intervalValue.lte)) && { lte: intervalValue.lte }),
						},
					},
				});
			} else {
				console.error(new RecursiveError(
					'Unknown filter during search',
					null,
					{ key: elasticKey, value }));
				return;
			}
		});
		return filterObject;
	}

	/**
	 * Builds up an object containing the elasticsearch  aggregation objects
	 * The result of these aggregations will be used to show in the multi select options lists in the search page
	 * The results will show:
	 * {
	 *   "key": "armoede",
	 *   "doc_count": 2
	 * },
	 * {
	 *   "key": "schulden",
	 *   "doc_count": 2
	 * },
	 * {
	 *   "key": "afbetaling",
	 *   "doc_count": 1
	 * }
	 * @param filterOptionSearch
	 */
	private static buildAggsObject(filterOptionSearch: Partial<FilterOptionSearch> | undefined): any {
		const aggs: any = {};
		_.forEach(aggsProperties, aggProperty => {
			const elasticProperty = READABLE_TO_ELASTIC_FILTER_NAMES[aggProperty];
			if (!elasticProperty) {
				throw new RecursiveError(`Failed to resolve agg property: ${aggProperty}`);
			}
			if (filterOptionSearch && filterOptionSearch[aggProperty]) {
				// An extra search filter should be applied for these filter options
				const filterOptionsTerm = filterOptionSearch[aggProperty];
				aggs[elasticProperty] = {
					filter: {
						term: {
							[elasticProperty]: filterOptionsTerm,
						},
					},
					aggs: {
						[elasticProperty]: {
							terms: {
								field: elasticProperty + this.suffix(aggProperty),
								size: NUMBER_OF_FILTER_OPTIONS,
							},
						},
					},
				};
			} else {
				// Return the first 20 filter options
				aggs[elasticProperty] = {
					terms: {
						field: elasticProperty + this.suffix(aggProperty),
						size: NUMBER_OF_FILTER_OPTIONS,
					},
				};
			}
		});
		return aggs;
	}

	/**
	 * Some properties in elasticsearch need a ".filter" suffix to work correctly
	 * This helper function makes it easier to get a suffix if one is required
	 * eg:
	 * "dc_titles_serie.filter": {
   *   "terms": {
   *     "field": "dc_titles_serie.filter"
   *   }
   * },
	 * @param prop
	 */
	private static suffix(prop: FilterProperty): string {
		return NEEDS_FILTER_SUFFIX[prop] ? '.filter' : '';
	}
}
