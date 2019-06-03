import { Filters, SearchOrderProperty, SearchOrderDirection } from './types';
import * as _ from 'lodash';

import * as elasticsearchTemplate from './elasticsearch-templates/search.json';
import { RecursiveError } from '../../helpers/recursiveError';

const escapeElastic = require('elasticsearch-sanitize');

const FILTER_NAME_MAPPINGS = {
	query: 'query',
	type: 'administrative_type.filter',
	educationLevel: 'lom_typical_age_range.filter',
	domain: 'lom_context.filter',
	broadcastDate: 'dcterms_issued',
	language: 'lom_languages',
	keywords: 'lom_keywords.filter',
	subject: 'lom_classification.filter',
	serie: 'dc_titles_serie.filter',
	duration: 'fragment_duration_seconds',
	provider: 'original_cp.filter',
};

export default class QueryBuilder {
	private static readonly orderMappings: { [prop: string]: any } = {
		relevance: '_score',
		views: 'view_count', // TODO replace key with actual key when available in elasticsearch
		broadcastDate: 'dcterms_issued',
		createdDate: 'created_date', // TODO replace key with actual key when available in elasticsearch
		lastEditDate: 'last_edit_date', // TODO replace key with actual key when available in elasticsearch
	};

	/**
	 * Convert filter object (created by the ui) to elasticsearch query object
	 * @param filters
	 * @param orderProperty
	 * @param orderDirection
	 * @param from
	 * @param size
	 */
	public static buildQueryObject(
		filters: Partial<Filters> | undefined,
		orderProperty: SearchOrderProperty = 'relevance',
		orderDirection: SearchOrderDirection = 'desc',
		from: number = 0,
		size: number = 30): any {
		try {
			const queryObject: any = _.cloneDeep(elasticsearchTemplate);
			delete queryObject.default; // Side effect of importing a json file as a module

			queryObject.from = from;
			queryObject.size = Math.min(size, 2000); // Avoid huge queries

			_.set(queryObject, 'sort', this.buildSortArray(orderProperty, orderDirection));

			// If no filters are passed, we want to do a default query with aggs
			if (!filters || _.isEmpty(filters)) {
				_.set(queryObject, 'query', { match_all: {} });
				_.unset(queryObject, 'query.bool');
				return queryObject;
			}

			const stringQuery = _.get(filters, 'query');
			if (stringQuery) {
				// Replace {{query}} in the template with the escaped search terms
				const escapedQueryString = escapeElastic(stringQuery); // Avoid elasticsearch injection attacks
				_.forEach(_.get(queryObject, 'query.bool.should'), (matchObj) => {
					_.set(matchObj, 'multi_match.query', escapedQueryString);
				});

				if (_.keys(filters).length === 1) {
					// Only a string query is passed, no need to add further filters
					return queryObject;
				}
			} else {
				// Remove the part of the template responsible for textual search
				_.unset(queryObject, 'query.bool.should');
			}

			// Add additional filters to the query object
			const filterArray: any[] = [];
			_.set(queryObject, 'query.bool.filter', filterArray);
			_.forEach(filters, (value: any, readableKey: string) => {
				if (readableKey === 'query') {
					return; // Query filter has already been handled, skip this foreach iteration
				}

				// Map frontend filter names to elasticsearch names
				const elasticKey = FILTER_NAME_MAPPINGS[readableKey];
				if (_.isArray(value) && _.every(value, (val) => _.isString(val))) {
					// Array of options
					// TODO if only one option use "term" instead of "terms" (better efficiency for elasticsearch)
					filterArray.push({
						terms: {
							[elasticKey]: value,
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
			return queryObject;
		} catch (err) {
			throw new RecursiveError(
				'Failed to build query object',
				err,
				{
					filters,
					orderProperty,
					orderDirection,
					from,
					size,
				},
			);
		}
	}

	/**
	 * Converts a sort prperty and direction to an elasticsearch sort array
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
	private static buildSortArray(orderProperty: SearchOrderProperty, orderDirection: SearchOrderDirection) {
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
}
