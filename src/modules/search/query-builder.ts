import { Filters, SearchResultOrderProperty, SearchResultOrderDirection } from './types';
import * as _ from 'lodash';

import * as elasticsearchTemplate from './elasticsearch-templates/search.json';
import { RecursiveError } from '../../helpers/recursiveError';

const escapeElastic = require('elasticsearch-sanitize');

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
		orderProperty: SearchResultOrderProperty = 'relevance',
		orderDirection: SearchResultOrderDirection = 'desc',
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
			} else {
				// Remove the part of the template responsible for textual search
				_.unset(queryObject, 'query.bool.should');
			}

			if (_.remove(_.keys(filters), 'query').length === 0) {
				// Only a string query is passed, no need to add further filters
				return queryObject;
			}

			// Add additional filters to the query object
			const filterArray: any[] = [];
			_.set(queryObject, 'query.bool.filter', filterArray);
			_.forEach(filters, (value: any, key: string) => {
				if (key === 'query') {
					return; // Query filter has already been handled, skip this foreach iteration
				} else if (_.isArray(value) && _.every(value, (val) => _.isString(val))) {
					// Array of options
					// TODO if only one option use "term" instead of "terms" (better efficiency for elasticsearch)
					const filterObj = {
						terms: {},
					};
					filterObj.terms[key] = [...value];
					filterArray.push(filterObj);
				} else if (_.isObject(value) && (!_.isNil(value['gte']) || !_.isNil(value['lte']))) {
					// Date/number interval
					const intervalValue = value as { gte?: string | number, lte?: string | number };
					const filterObj = {
						range: {},
					};
					filterObj.range[key] = {};
					if (!_.isNil(intervalValue.gte)) {
						filterObj.range[key].gte = intervalValue.gte;
					}
					if (!_.isNil(intervalValue.lte)) {
						filterObj.range[key].lte = intervalValue.lte;
					}
					filterArray.push(filterObj);
				} else {
					console.error(new RecursiveError(
						'Unknown filter during search',
						null,
						{ key, value }));
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
	private static buildSortArray(orderProperty: SearchResultOrderProperty, orderDirection: SearchResultOrderDirection) {
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
