import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { InternalServerError, NotFoundError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { IdpHelper } from '../auth/idp-helper';

import CollectionsController from './collections.controller';

@Path('/collections')
export default class CollectionsRoute {
	@Context
	context: ServiceContext;

	@Path('/fetch-with-items-by-id')
	@GET
	async fetchCollectionOrBundleWithItemsById(
		@QueryParam('id') id: string,
		@QueryParam('type') type: 'collection' | 'bundle',
		@QueryParam('assignmentUuid') assignmentUuid: string | undefined
	): Promise<Avo.Collection.Collection | null> {
		let collection: Avo.Collection.Collection | null = null;
		try {
			const avoUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			collection = await CollectionsController.fetchCollectionWithItemsById(
				id,
				type,
				assignmentUuid,
				avoUser
			);
		} catch (err) {
			logger.error(new InternalServerError('Failed to get collection', err));
			throw new InternalServerError('Failed to get collection', null, { id, type });
		}
		if (collection) {
			return collection;
		}
		throw new NotFoundError(
			'The collection was not found or you do not have rights to see it',
			null,
			{ id }
		);
	}

	@Path('/fetch-external-id-by-mediamosa-id')
	@GET
	async fetchItemExternalIdByMediamosaId(
		@QueryParam('id') id: string
	): Promise<{ externalId: string | null }> {
		try {
			return { externalId: await CollectionsController.fetchItemExternalIdByMediamosaId(id) };
		} catch (err) {
			const error = new InternalServerError(
				'Failed to fetchItemExternalIdByMediamosaId',
				err,
				{ id }
			);
			logger.error(error);
			throw new InternalServerError(error.message, null, { id });
		}
	}

	@Path('/fetch-uuid-by-avo1-id')
	@GET
	async fetchUuidByAvo1Id(@QueryParam('id') id: string): Promise<{ uuid: string | null }> {
		try {
			return { uuid: await CollectionsController.fetchUuidByAvo1Id(id) };
		} catch (err) {
			const error = new InternalServerError('Failed to fetchUuidByAvo1Id', err, { id });
			logger.error(error);
			throw new InternalServerError(error.message, null, { id });
		}
	}
}
