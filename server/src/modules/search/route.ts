import SearchController from './controller';
import { Path, POST, PreProcessor } from 'typescript-rest';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

@Path('/search')
export default class SearchRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest <Avo.Search.Request>
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticated)
	async search(searchRequest: any): Promise<any> {
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new CustomError('failed during search route', err, { ...searchRequest });
			logger.error(error.toString());
			throw error;
		}
	}
}
