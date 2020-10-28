import { Context, DELETE, Path, PreProcessor, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import {
	hasPermissionRouteGuard,
	isAuthenticatedRouteGuard,
	multiGuard,
} from '../../shared/middleware/is-authenticated';
import { PermissionName } from '../../shared/permissions';

import UserController from './user.controller';
import { BulkDeleteUsersBody } from './user.types';

@Path('/user')
export default class UserRoute {
	@Context
	context: ServiceContext;

	/**
	 * Update profile info
	 * This is implemented as a separate route from the data route
	 * since we need to check the education levels property to add/remove this user to the "lesgever secundair" if need be
	 */
	@Path('bulk-delete')
	@DELETE
	@PreProcessor(
		multiGuard(
			isAuthenticatedRouteGuard,
			hasPermissionRouteGuard(PermissionName.DELETE_ANY_USER)
		)
	)
	async bulkDeleteUsers(body: BulkDeleteUsersBody): Promise<{ message: 'ok' }> {
		try {
			await UserController.bulkDeleteUsers(
				body.profileIds,
				body.deleteOption,
				body.transferToProfileId
			);
			return { message: 'ok' };
		} catch (err) {
			const error = new InternalServerError('Failed to bulk delete users', err, { body });
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
