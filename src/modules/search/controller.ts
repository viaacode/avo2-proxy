import { SearchResponse, SearchRequest } from './types';
import { RecursiveError } from '../../helpers/recursiveError';
import SearchService from './service';
import QueryBuilder from './queryBuilder';

export default class SearchController {

	public static async search(searchRequest: SearchRequest): Promise<SearchResponse> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = QueryBuilder.buildSearchObject(searchRequest);

			// Perform search
			console.log('----------\nquery: ', JSON.stringify(esQueryObject));
			return await SearchService.search(esQueryObject);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to do search, are you connected to the elasticsearch VPN?',
					err,
					{ ...searchRequest }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to do search',
					err,
					{ ...searchRequest });
			}
		}
	}
}
