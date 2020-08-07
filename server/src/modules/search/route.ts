import { GET, Path, POST, PreProcessor, QueryParam } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';

import SearchController, { EsIndex } from './controller';

@Path('/search')
export default class SearchRoute {
	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest <Avo.Search.Request>
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	async search(searchRequest: any): Promise<any> {
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new InternalServerError('failed during search route', err, {
				...searchRequest,
			});
			logger.error(error);
			throw error;
		}
	}

	@Path('/related')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async related(
		@QueryParam('id') itemId: string,
		@QueryParam('type') type: EsIndex,
		@QueryParam('limit') limit: number
	): Promise<Avo.Search.Search> {
		try {
			if (!['items', 'collections', 'bundles'].includes(type)) {
				throw new BadRequestError(
					`parameter "type" has to be one of ["items", "collections", "bundles"], received: ${type}`
				);
			}

			return await SearchController.getRelatedItems(itemId, type as any, limit); // TODO remove cast after update to typings v2.14.0
		} catch (err) {
			const error = new InternalServerError('failed during search/related route', err, {
				itemId,
				type,
				limit,
			});
			logger.error(error);
			throw error;
		}
	}
}
