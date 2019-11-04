import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';
import DataController from './controller';
import { CustomError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import HetArchiefController from '../auth/idps/hetarchief/controller';

interface DataQuery {
	query: any;
	variables: any;
}

@Path('/data')
export default class DataRoute {
	@Context
	context: ServiceContext;

	/**
	 * Endpoint that is proxied to the graphql server so the client can collect data
	 * @param body
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticated)
	async post(body: DataQuery): Promise<any> {
		try {
			return await DataController.execute(
				body.query,
				body.variables,
				this.context.request.headers,
				HetArchiefController.getUserInfoFromSession(this.context.request)
			);
		} catch (err) {
			throw new CustomError('Failed to get data from graphql', err, { ...body });
		}
	}
}
