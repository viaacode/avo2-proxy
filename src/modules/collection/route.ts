import { Path, GET, QueryParam } from 'typescript-rest';
import { Avo } from '@viaa/avo2-types';
import CollectionController from './controller';
import * as _ from 'lodash';
import { BadRequestError, InternalServerError, HttpError } from 'typescript-rest/dist/server/model/errors';

@Path('/collection')
export default class CollectionRoute {

	/**
	 * Gets one collection with the specified id or returns an error code and a recursive error if not found/error
	 * @param id <string>
	 * @param ownerId
	 */
	@Path('')
	@GET
	async get(@QueryParam('id') id?: string, @QueryParam('ownerId') ownerId?: number): Promise<Avo.Collection.Response | Avo.Collection.Response[]> {
		try {
			if (!_.isUndefined(id)) {
				return await CollectionController.getByCollectionId(id);
			} else if (!_.isUndefined(ownerId)) {
				return await CollectionController.getByOwnerId(ownerId);
			} else {
				throw new BadRequestError('At least one query param is required: id or ownerId');
			}
		} catch (err) {
			if (err instanceof HttpError) {
				throw err;
			} else {
				// Recursive error
				throw new InternalServerError(JSON.stringify(err, null, 2));
			}
		}
	}
}
