import { SearchResponse, SearchRequest } from './types';
import { RecursiveError } from '../../helpers/recursiveError';
import SearchService from './service';
import QueryBuilder from './query-builder';

export default class SearchController {

	public static async search(searchRequest: SearchRequest): Promise<SearchResponse> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = QueryBuilder.buildQueryObject(
				searchRequest.filters,
				searchRequest.orderProperty,
				searchRequest.orderDirection,
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
}
