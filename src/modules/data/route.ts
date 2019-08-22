import { Path, POST } from 'typescript-rest';
import DataController from './controller';

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
		return await DataController.execute(body);
	}
}
