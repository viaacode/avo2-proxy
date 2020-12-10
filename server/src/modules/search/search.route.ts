import { isNil } from 'lodash';
import { GET, Path, POST, PreProcessor, QueryParam } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import {
	hasPermissionRouteGuard,
	isAuthenticatedRouteGuard,
	multiGuard,
} from '../../shared/middleware/is-authenticated';
import { PermissionName } from '../../shared/permissions';

import SearchController from './search.controller';

@Path('/search')
export default class SearchRoute {
	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param searchRequest <Avo.Search.Request>
	 */
	@Path('')
	@POST
	@PreProcessor(
		multiGuard(isAuthenticatedRouteGuard, hasPermissionRouteGuard(PermissionName.SEARCH))
	)
	async search(searchRequest: any): Promise<any> {
		if (isNil(searchRequest.size)) {
			throw new BadRequestError('size parameter is required', null, { searchRequest });
		}
		try {
			return await SearchController.search(searchRequest);
		} catch (err) {
			const error = new InternalServerError('failed during search route', err, {
				searchRequest,
			});
			logger.error(error);
			throw new InternalServerError(error.message, null, { searchRequest });
		}
	}

	@Path('/related')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async related(
		@QueryParam('id') itemId: string,
		@QueryParam('type') type: Avo.Search.EsIndex,
		@QueryParam('limit') limit: number
	): Promise<Avo.Search.Search> {
		try {
			if (!['items', 'collections', 'bundles'].includes(type)) {
				throw new BadRequestError(
					`parameter "type" has to be one of ["items", "collections", "bundles"], received: ${type}`
				);
			}

			return await SearchController.getRelatedItems(itemId, type, limit);
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
