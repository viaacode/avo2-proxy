import { ISearchResponse, IFilters, ISearchRequest } from './types';
import * as _ from 'lodash';

import * as elasticsearchTemplate from './elasticsearch-template.json';
import { RecursiveError } from '../../helpers/recursiveError';
import SearchService from './service';

export default class SearchController {

	public static async search(searchRequest: ISearchRequest): Promise<ISearchResponse> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = SearchController.buildQueryObject(searchRequest.filters, searchRequest.from, searchRequest.size);

			// Preform search
			console.log('query: ', JSON.stringify(esQueryObject, null, 2));
			const results = await SearchService.search(esQueryObject);
			console.log('results: ', JSON.stringify(results, null, 2));
			return results;
		} catch (err) {
			throw new RecursiveError('Failed to do search', err, { ...searchRequest });
		}
	}

	/**
	 * Convert filter object (created by the ui) to elasticsearch query object
	 * @param filters
	 * @param from
	 * @param size
	 */
	private static buildQueryObject(filters: Partial<IFilters>, from: number, size: number): any {
		let queryObject: any = elasticsearchTemplate;
		queryObject.from = from;
		queryObject.size = size;
		if (filters.query) {
			// Replace {{query}} in the stringified template with the actual search terms
			queryObject = JSON.parse(JSON.stringify(queryObject).replace(/{{query}}/g, filters.query));
		} else {
			// Remove the part of the template responsible for textual search
			_.unset(queryObject, 'query.bool.should');
		}

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
	}
}
