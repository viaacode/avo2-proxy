import SearchController from './controller';
import { Path, POST } from 'typescript-rest';
import { SearchResponse } from './types';
import { RecursiveError } from '../../helpers/recursiveError';

@Path('/search')
export default class SearchRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest <SearchRequest>
	 */
	@Path('search')
	@POST
	// searchRequest has any otherwise swagger gen complains about nullable types
	// https://github.com/thiagobustamante/typescript-rest-swagger/issues/68
	async search(searchRequest: any): Promise<SearchResponse> {
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new RecursiveError('failed during search route', err, { ...searchRequest });
			console.error(error.toString());
			throw error;
		}
	}
}
