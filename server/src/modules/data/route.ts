import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import DataController from './controller';

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
				IdpHelper.getAvoUserInfoFromSession(this.context.request)
			);
		} catch (err) {
			throw new InternalServerError('Failed to get data from graphql', err, { ...body });
		}
	}
}
