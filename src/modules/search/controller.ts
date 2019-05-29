import { SearchResponse, Filters, SearchRequest } from './types';
import * as _ from 'lodash';

import * as elasticsearchTemplate from './elasticsearch-templates/search.json';
import { RecursiveError } from '../../helpers/recursiveError';
import SearchService from './service';

export default class SearchController {

	public static async search(searchRequest: SearchRequest): Promise<SearchResponse> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = SearchController.buildQueryObject(
				searchRequest.filters,
				searchRequest.from,
				searchRequest.size);

			// Preform search
			console.log('query: ', JSON.stringify(esQueryObject, null, 2));
			const results: SearchResponse = await SearchService.search(esQueryObject);
			console.log('results: ', JSON.stringify(results, null, 2));
			return results;
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError('Failed to do search, are you connected to the elasticsearch VPN?', err, { ...searchRequest }); // TODO remove dev error
			} else {
				throw new RecursiveError('Failed to do search', err, { ...searchRequest });
			}
		}
	}

	/**
	 * Convert filter object (created by the ui) to elasticsearch query object
	 * @param filters
	 * @param from
	 * @param size
	 */
	private static buildQueryObject(
		filters: Partial<Filters> | undefined,
		from: number | undefined,
		size: number | undefined): any {
		let queryObject: any = _.cloneDeep(elasticsearchTemplate);
		delete queryObject.default; // Side effect of importing a json file as a module

		if (!_.isUndefined(from)) {
			queryObject.from = from;
		}
		if (!_.isUndefined(size)) {
			queryObject.size = size;
		}

		// If no filters are passed, we want to do a default query with aggs
		if (!filters || _.isEmpty(filters)) {
			_.set(queryObject, 'query', { match_all: {} });
			_.unset(queryObject, 'query.bool');
			return queryObject;
		}

		const stringQuery = _.get(filters, 'query');
		if (stringQuery) {
			// Replace {{query}} in the stringified template with the actual search terms
			queryObject = JSON.parse(JSON.stringify(queryObject).replace(/{{query}}/g, stringQuery));
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
	}
}
