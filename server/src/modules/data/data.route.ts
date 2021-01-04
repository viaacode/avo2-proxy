import { isNil } from 'lodash';
import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { BadRequestError, ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import DataController from './data.controller';
import DataService from './data.service';

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
			const avoUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);

			// Check if user can execute query
			const whitelistedQuery: string | null = await DataService.isAllowedToRunQuery(
				avoUser,
				body.query,
				body.variables,
				'CLIENT'
			);
			if (isNil(whitelistedQuery)) {
				throw new BadRequestError('You are not allowed to run this query');
			}

			return await DataController.execute(
				whitelistedQuery,
				body.variables,
				{
					...this.context.request.headers,
				},
				avoUser
			);
		} catch (err) {
			logger.error(
				new InternalServerError('Failed to get data from graphql', err, { ...body })
			);
			if (err instanceof ClientError) {
				throw new ClientError(
					'Something failed while making the request to the database',
					err,
					{ body }
				);
			}
			throw new ClientError(
				'Something failed while making the request to the database',
				null,
				{ body }
			);
		}
	}
}
