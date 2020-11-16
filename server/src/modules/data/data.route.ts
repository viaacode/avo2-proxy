import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';
import { AuthService } from '../auth/service';

import DataController from './data.controller';

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
			const allUserGroups = await AuthService.getAllUserGroups();
			const userGroup = allUserGroups.find(
				(userGroup) => userGroup.id === avoUser.profile.userGroupIds[0]
			);
			if (!userGroup) {
				throw new InternalServerError('Failed to find user group for user group id', null, {
					allUserGroups,
					userGroupId: avoUser.profile.userGroupIds[0],
				});
			}
			const userGroupLabel = userGroup.label;
			return await DataController.execute(
				body.query,
				body.variables,
				{
					...this.context.request.headers,
					'X-Hasura-Role': userGroupLabel,
				},
				avoUser
			);
		} catch (err) {
			logger.error(
				new InternalServerError('Failed to get data from graphql', err, { ...body })
			);
			throw new ClientError('Something failed while making the request to the database');
		}
	}
}
