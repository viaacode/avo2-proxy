import * as promiseUtils from 'blend-promise-utils';
import { isEmpty } from 'lodash';
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

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import {
	hasPermissionRouteGuard,
	isAuthenticatedRouteGuard,
	multiGuard,
} from '../../shared/middleware/is-authenticated';
import { PermissionName } from '../../shared/permissions';
import { IdpHelper } from '../auth/idp-helper';
import CampaignMonitorService from '../campaign-monitor/campaign-monitor.service';

import UserController from './user.controller';
import UserService from './user.service';
import { ProfileBlockEvents } from './user.types';

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
	async bulkDeleteUsers(body: any): Promise<{ message: 'ok' }> {
		try {
			const currentUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			const typedBody: Avo.User.BulkDeleteUsersBody = body;
			const emails: string[] = await UserService.bulkGetEmails(typedBody.profileIds);

			// Send emails now that the users are still in campaign monitor
			await promiseUtils.mapLimit(emails, 20, async (email: string) => {
				if (isEmpty(email)) {
					return;
				}

				await CampaignMonitorService.send({
					to: email,
					template: 'deleteUser',
					data: { email },
				});
			});

			await UserController.bulkDeleteUsers(
				typedBody.profileIds,
				typedBody.deleteOption,
				typedBody.transferToProfileId || null,
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
	async bulkUpdateBlockStatus(body: any): Promise<{ message: 'ok' }> {
		try {
			const currentUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			const typedBody: Avo.User.BulkBlockUsersBody = body;
			await UserController.bulkUpdateBlockStatus(
				typedBody.profileIds,
				typedBody.isBlocked,
				currentUser
			);
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
	async getUserInfo(@QueryParam('profileId') profileId: string): Promise<ProfileBlockEvents> {
		if (!profileId) {
			throw new BadRequestError(
				'This route requires profileId to be passed as a query param, eg: user/info?profileId=b78874df-6993-4432-afbe-014696f40d9b'
			);
		}
		try {
			return await UserController.getUserInfo(profileId);
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
