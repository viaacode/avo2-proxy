import { Path, POST } from 'typescript-rest';
import DataController from './controller';
import { RecursiveError } from '../../helpers/recursiveError';

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
	async post(body: DataQuery): Promise<any> {
		try {
			return await DataController.execute(body.query, body.variables);
		} catch (err) {
			throw new RecursiveError('Failed to get data from graphql');
		}
	}
}
