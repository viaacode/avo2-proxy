import SearchController from './controller';
import { Path, POST } from 'typescript-rest';
import { SearchRequest, SearchResponse } from './types';
import { RecursiveError } from '../../helpers/recursiveError';

@Path('/search')
export default class SearchRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest
	 */
	@Path('search')
	@POST
	async search(searchRequest: SearchRequest): Promise<SearchResponse> {
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new RecursiveError('failed during search route', err, { ...searchRequest });
			console.error(error.toString());
			throw error;
		}
	}
}
