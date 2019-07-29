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
	async getOne(@QueryParam('id') id: string): Promise<Avo.Item.Response> {
		try {
			return await ItemController.getItemById(id);
		} catch (err) {
			const error = new RecursiveError('failed during get item by id route', err, { id });
			console.error(error.toString());
			throw error;
		}
	}
}
