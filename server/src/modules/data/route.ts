import { isString } from 'lodash';
import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { mapDeep } from '../../shared/helpers/map-deep';
import { sanitizeHtml } from '../../shared/helpers/sanitize';
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
			const variables = body.variables;

			const sanitizedVariables = mapDeep(variables, (obj: any, key: string, value: any) => {
				if (isString(value)) {
					obj[key] = sanitizeHtml(value, 'full');
				}
			});

			return await DataController.execute(
				body.query,
				sanitizedVariables,
				this.context.request.headers,
				IdpHelper.getAvoUserInfoFromSession(this.context.request)
			);
		} catch (err) {
			logger.error(
				new InternalServerError('Failed to get data from graphql', err, { ...body })
			);
			throw new ClientError('Something failed while making the request to the database');
		}
	}
}
