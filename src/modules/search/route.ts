import SearchController from './controller';
import { Path, POST } from 'typescript-rest';
import { ISearchRequest, ISearchResponse } from './types';
import { RecursiveError } from '../../helpers/recursiveError';

@Path('/search')
export default class SearchRoute {

	@Path('search')
	@POST
	filter(searchRequest: ISearchRequest): Promise<ISearchResponse> | RecursiveError {
		try {
			return SearchController.search(searchRequest);
		} catch (err) {
			const error = new RecursiveError('failed during search route', err, { ...searchRequest });
			console.error(JSON.stringify(error, null, 2));
			return error;
		}
	}
}
