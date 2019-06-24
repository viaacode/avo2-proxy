import { Path, GET, QueryParam } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import { DetailResponse } from './types';
import DetailController from './controller';

@Path('/detail')
export default class DetailRoute {

	/**
	 * If no searchRequest.filters are passed, then a default search with aggregations is executed
	 * @param id <string>
	 */
	@Path('')
	@GET
	// searchRequest has any otherwise swagger gen complains about nullable types
	// https://github.com/thiagobustamante/typescript-rest-swagger/issues/68
	async detail(@QueryParam('id') id: string): Promise<DetailResponse> {
		try {
			return await DetailController.get(id);
		} catch (err) {
			const error = new RecursiveError('failed during search route', err, { id });
			console.error(error.toString());
			throw error;
		}
	}
}
