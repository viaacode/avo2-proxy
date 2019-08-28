import SearchController from './controller';
import { Path, POST } from 'typescript-rest';
import {Avo} from '@viaa/avo2-types';
import { logger } from '@shared/helpers/logger';
import { CustomError } from '@shared/helpers/error';

@Path('/search')
export default class SearchRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest <Avo.Search.Request>
	 */
	@Path('')
	@POST
	async search(searchRequest: Avo.Search.Request): Promise<Avo.Search.Response> {
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new CustomError('failed during search route', err, { ...searchRequest });
			logger.error(error.toString());
			throw error;
		}
	}
}
