import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import {
	AggProps,
	AGGS_PROPERTIES, MAX_COUNT_SEARCH_RESULTS,
	MAX_NUMBER_SEARCH_RESULTS, NEEDS_FILTER_SUFFIX,
	NUMBER_OF_FILTER_OPTIONS,
	READABLE_TO_ELASTIC_FILTER_NAMES,
} from './constants';
import textQueryObjectTemplateImport from './elasticsearch-templates/text-query-object.json';

const removeAccents = require('remove-accents');

const textQueryObjectTemplate = _.values(textQueryObjectTemplateImport);

export default class QueryBuilder {
	private static readonly orderMappings: { [prop: string]: any } = {
		relevance: '_score',
		views: 'views_count',
		broadcastDate: 'dcterms_issued',
		createdAt: 'created_at',
		updatedAt: 'updated_at',
	};

	/**
	 * Convert filters, order, aggs properties (created by the ui) to elasticsearch query object
	 * @param searchRequest
	 */
	public static buildSearchObject(searchRequest: Avo.Search.Request): any {
		try {
			const queryObject: any = {};
			delete queryObject.default; // Side effect of importing a json file as a module

			// Avoid huge queries
			queryObject.size = Math.min(searchRequest.size || 30, MAX_NUMBER_SEARCH_RESULTS);
			const max = Math.max(0, MAX_COUNT_SEARCH_RESULTS - queryObject.size);
			queryObject.from = _.clamp(searchRequest.from || 0, 0, max);

			// Provide the ordering to the query object
			_.set(queryObject, 'sort', this.buildSortArray(searchRequest.orderProperty, searchRequest.orderDirection));

			// Add the filters and search terms to the query object
			_.set(queryObject, 'query', this.buildFilterObject(searchRequest.filters));

			// Specify the aggs objects with optional search terms
			_.set(queryObject, 'aggs', this.buildAggsObject(searchRequest.filterOptionSearch));

			// If search terms are passed, we're only interested in items with a score > 0
			// If only filters are passed, and no search terms, then score 0 items are also accepted
			if (searchRequest.filters && searchRequest.filters.query) {
				queryObject.min_score = 0.5;
			}

			return queryObject;
		} catch (err) {
			throw new InternalServerError(
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
		orderProperty: Avo.Search.OrderProperty | undefined = 'relevance',
		orderDirection: Avo.Search.OrderDirection | undefined = 'desc') {
		const mappedOrderProperty = this.orderMappings[orderProperty];
		const sortArray: any[] = [];
		if (mappedOrderProperty !== '_score') {
			let sortItem: any;
			if (mappedOrderProperty === 'dcterms_issued') {
				sortItem = { dcterms_issued: { order: orderDirection, unmapped_type: 'date', missing: '_last' } };
			} else {
				sortItem = {
					[mappedOrderProperty]: {
						order: orderDirection,
					},
				};
			}
			sortArray.push(sortItem);
		} else {
			// Always order by relevance if 2 search items have identical primary sort values
			sortArray.push('_score');
			// TODO re-enable after https://meemoo.atlassian.net/browse/DEV-735
			// If score is equal, sort them by broadcast date
			sortArray.push({ dcterms_issued: { order: orderDirection, unmapped_type: 'date', missing: '_last' } });
		}
		return sortArray;
	}

	/**
	 * OR filter: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html
	 * @param elasticKey
	 * @param readableKey
	 * @param values
	 */
	private static generateOrFilter(elasticKey: string, readableKey: string, values: string[]): any {
		return {
			terms: {
				[elasticKey + this.suffix(readableKey as Avo.Search.FilterProp)]: values,
			},
		};
	}

	/**
	 * AND filter: https://stackoverflow.com/a/52206289/373207
	 * @param elasticKey
	 * @param readableKey
	 * @param values
	 */
	private static generateAndFilter(elasticKey: string, readableKey: string, values: string[]): any {
		return {
			bool: {
				should: [values.map(value => ({
					term: {
						lom_keywords: value,
					},
				}))],
				minimum_should_match : values.length,
			},
		};
	}

	/**
	 * Creates the filter portion of the elsaticsearch query object
	 * Containing the search terms and the checked filters
	 * @param filters
	 */
	private static buildFilterObject(filters: Partial<Avo.Search.Filters> | undefined) {
		if (!filters || _.isEmpty(filters)) {
			// Return query object that will match all results
			return { match_all: {} };
		}

		const filterObject: any = {};
		const stringQuery = _.get(filters, 'query');
		if (stringQuery) {
			// Replace {{query}} in the template with the escaped search terms
			const textQueryObjectArray = _.cloneDeep(textQueryObjectTemplate);
			const escapedQueryString = stringQuery;
			_.forEach(textQueryObjectArray, (matchObj) => {
				_.set(matchObj, 'multi_match.query', escapedQueryString);
			});

			_.set(filterObject, 'bool.should', textQueryObjectArray);

			if (_.keys(filters).length === 1) {
				// Only a string query is passed, no need to add further filters
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
			const elasticKey = READABLE_TO_ELASTIC_FILTER_NAMES[readableKey as Avo.Search.FilterProp];
			if (!elasticKey) {
				throw new InternalServerError(`Failed to resolve agg property: ${readableKey}`);
			}
			if (_.isArray(value) && _.every(value, (val: any) => _.isString(val))) {
				// Array of options
				// TODO if only one option use "term" instead of "terms" (better efficiency for elasticsearch)
				if (readableKey === 'keyword') {
					filterArray.push(this.generateAndFilter(elasticKey, readableKey, value));
				} else {
					filterArray.push(this.generateOrFilter(elasticKey, readableKey, value));
				}
			} else if (_.isPlainObject(value) && (!_.isNil(value['gte']) || !_.isNil(value['lte']))) {
				// Date/number interval
				const intervalValue = value as { gte?: string | number, lte?: string | number };
				filterArray.push({
					range: {
						[elasticKey]: {
							...(intervalValue.gte && { gte: intervalValue.gte }),
							...(intervalValue.lte && { lte: intervalValue.lte }),
						},
					},
				});
			} else {
				logger.error(new InternalServerError(
					'Unknown filter during search',
					null,
					{ value, key: elasticKey }));
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
	private static buildAggsObject(filterOptionSearch: Partial<Avo.Search.FilterOption> | undefined): any {
		const aggs: any = {};
		_.forEach(AGGS_PROPERTIES, (aggProperty) => {
			const elasticProperty = READABLE_TO_ELASTIC_FILTER_NAMES[aggProperty];
			if (!elasticProperty) {
				throw new InternalServerError(`Failed to resolve agg property: ${aggProperty}`);
			}
			if (filterOptionSearch && (filterOptionSearch as any)[aggProperty]) {
				// An extra search filter should be applied for these filter options
				const filterOptionsTerm: string | undefined = (filterOptionSearch as any)[aggProperty as AggProps];
				aggs[elasticProperty] = {
					filter: {
						term: {
							// Remove accents and lower case otherwise the response is always empty for this agg query
							[elasticProperty]: removeAccents(filterOptionsTerm.toLowerCase()),
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
	private static suffix(prop: Avo.Search.FilterProp): string {
		return NEEDS_FILTER_SUFFIX[prop] ? '.filter' : '';
	}
}
