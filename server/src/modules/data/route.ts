import { Path, POST, PreProcessor } from 'typescript-rest';
import DataController from './controller';
import { CustomError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

interface DataQuery {
	query: any;
	variables: any;
}

@Path('/data')
export default class DataRoute {

	/**
	 * Endpoint that is proxied to the graphql server so the client can collect data
	 * @param body
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticated)
	async post(body: DataQuery): Promise<any> {
		try { // TODO check if the user is logged in
			return await DataController.execute(body.query, body.variables);
		} catch (err) {
			throw new CustomError('Failed to get data from graphql', err, { ...body });
		}
	}
}
