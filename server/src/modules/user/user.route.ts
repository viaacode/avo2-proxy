import {
	Context,
	DELETE,
	GET,
	Path,
	POST,
	PreProcessor,
	QueryParam,
	ServiceContext,
} from 'typescript-rest';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import {
	hasPermissionRouteGuard,
	isAuthenticatedRouteGuard,
	multiGuard,
} from '../../shared/middleware/is-authenticated';
import { PermissionName } from '../../shared/permissions';
import { IdpHelper } from '../auth/idp-helper';

import UserController from './user.controller';
import { BulkBlockUsersBody, BulkDeleteUsersBody, ProfileBlockEvents } from './user.types';

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
			const currentUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			await UserController.bulkDeleteUsers(
				body.profileIds,
				body.deleteOption,
				body.transferToProfileId || null,
				currentUser
			);
			return { message: 'ok' };
		} catch (err) {
			const error = new InternalServerError('Failed to bulk delete users', err, { body });
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}

	@Path('bulk-block')
	@POST
	@PreProcessor(
		multiGuard(
			isAuthenticatedRouteGuard,
			hasPermissionRouteGuard(PermissionName.EDIT_BAN_USER_STATUS)
		)
	)
	async bulkUpdateBlockStatus(body: BulkBlockUsersBody): Promise<{ message: 'ok' }> {
		try {
			const currentUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			await UserController.bulkUpdateBlockStatus(body.profileIds, body.isBlocked, currentUser);
			return { message: 'ok' };
		} catch (err) {
			const error = new InternalServerError('Failed to bulk block/unblock users', err, {
				body,
			});
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}

	/**
	 * Fetches info for user from events database, eg: blocked at and unblocked at dates
	 * @param profileId
	 */
	@Path('info')
	@GET
	@PreProcessor(
		multiGuard(isAuthenticatedRouteGuard, hasPermissionRouteGuard(PermissionName.VIEW_USERS))
	)
	async getUserInfo(
		@QueryParam('profileId') profileId: string
	): Promise<ProfileBlockEvents> {
		if (!profileId) {
			throw new BadRequestError('This route requires profileId to be passed as a query param, eg: user/info?profileId=b78874df-6993-4432-afbe-014696f40d9b')
		}
		try {
			const response = await UserController.getUserInfo(profileId);
			return response;
		} catch (err) {
			const error = new InternalServerError(
				'Failed to fetch user block and unblock events',
				err,
				{
					profileId,
				}
			);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
