import { GET, Path, POST, PreProcessor, QueryParam } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import SearchController from './controller';
import { logger } from '../../shared/helpers/logger';
import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import { EsIndex } from '@viaa/avo2-types/types/search/types';

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
			const error = new InternalServerError('failed during search route', err, { ...searchRequest });
			logger.error(error.toString());
			throw error;
		}
	}

	@Path('/related')
	@GET
	@PreProcessor(isAuthenticated)
	async related(
		@QueryParam('id') itemId: string,
		@QueryParam('index') index: string,
		@QueryParam('limit') limit: number): Promise<Avo.Search.Search> {
		try {
			if (!['both', 'items', 'collections'].includes(index)) {
				throw new BadRequestError('parameter "index" has to be one of ["both", "items", "collections"]', null, { itemId, index, limit });
			}

			return await SearchController.getRelatedItems(itemId, index as EsIndex, limit);
		} catch (err) {
			const error = new InternalServerError('failed during search/related route', err, { itemId });
			logger.error(error.toString());
			throw error;
		}
	}
}
