import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
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
	@PreProcessor(isAuthenticatedRouteGuard)
	async post(body: DataQuery): Promise<any> {
		try {
			return await DataController.execute(
				body.query,
				body.variables,
				this.context.request.headers,
				IdpHelper.getAvoUserInfoFromSession(this.context.request)
			);
		} catch (err) {
			logger.error(new InternalServerError('Failed to get data from graphql', err, { ...body }));
			throw new ClientError('Something failed while making the request to the database');
		}
	}
}
