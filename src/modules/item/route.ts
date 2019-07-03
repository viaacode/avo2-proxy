import { Path, GET, QueryParam } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import {Avo} from '@viaa/avo2-types';
import ItemController from './controller';

@Path('/item')
export default class ItemRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param id <string>
	 */
	@Path('')
	@GET
	async item(@QueryParam('id') id: string): Promise<Avo.Item.Response> {
		try {
			return await ItemController.get(id);
		} catch (err) {
			const error = new RecursiveError('failed during item item route', err, { id });
			console.error(error.toString());
			throw error;
		}
	}
}
