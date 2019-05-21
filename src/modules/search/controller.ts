import { IFilterResponse, IFilters } from './types';

export default class SearchController {

	public static filter(filters: Partial<IFilters>, from: number, size: number): IFilterResponse {
		// Convert filters to ElasticSearch query object using queryBuilder

		// Preform search

		// Return search results
		return {
			count: 1,
			results: [
				{
					name: 'test result',
					thumbnailUrl: 'https://web.library.uq.edu.au/files/37556/search-icon.png',
				},
			],
		};
	}

}
