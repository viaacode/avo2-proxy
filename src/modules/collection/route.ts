import { Path, GET, QueryParam } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import {Avo} from '@viaa/avo2-types';
import CollectionController from './controller';

@Path('/collection')
export default class CollectionRoute {

	/**
	 * Gets one collection with the specified id or returns an error code and a recursive error if not found/error
	 * @param id <string>
	 */
	@Path('')
	@GET
	async detail(@QueryParam('id') id: string): Promise<Avo.Collection.Response> {
		try {
			return await CollectionController.get(id);
		} catch (err) {
			const error = new RecursiveError('failed during collection route', err, { id });
			console.error(error.toString());
			throw error;
		}
	}
}
