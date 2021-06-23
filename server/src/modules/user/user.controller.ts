import * as promiseUtils from 'blend-promise-utils';

import type { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import HetArchiefService from '../auth/idps/het-archief/het-archief.service';
import CampaignMonitorService from '../campaign-monitor/campaign-monitor.service';
import { EmailUserInfo } from '../campaign-monitor/campaign-monitor.types';
import EventLoggingService from '../event-logging/service';
import { LogEvent } from '../event-logging/types';

import UserService from './user.service';
import { ProfileBlockEvents } from './user.types';

export default class UserController {
	static async bulkDeleteUsers(
		profileIds: string[],
		deleteOption: Avo.User.UserDeleteOption,
		transferToProfileId: string | null,
		currentUser: Avo.User.User
	) {
		// Remove them from campaign monitor
		const emailAddresses = await UserService.bulkGetEmails(profileIds);
		await CampaignMonitorService.bulkDeleteUsers(emailAddresses);
		await HetArchiefService.removeAvoAppFromLdapUsers(emailAddresses)
			.catch(error => logger.info('Avo app delete failed - probably already deleted.', { emailAddresses, error }));

		switch (deleteOption) {
			case 'DELETE_PRIVATE_KEEP_NAME':
				await UserService.softDeletePrivateContentForProfiles(profileIds);
				await UserService.stripUserAccount(profileIds, false);
				break;

			case 'TRANSFER_PUBLIC':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.softDeletePrivateContentForProfiles(profileIds);
				await UserService.bulkSoftDeleteUsers(profileIds);
				break;

			case 'TRANSFER_ALL':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.transferPrivateContentForProfiles(
					profileIds,
					transferToProfileId
				);
				await UserService.bulkSoftDeleteUsers(profileIds);
				break;

			case 'ANONYMIZE_PUBLIC':
				await UserService.softDeletePrivateContentForProfiles(profileIds);
				await UserService.stripUserAccount(profileIds, true);
				break;

			case 'DELETE_ALL':
				await UserService.softDeletePrivateContentForProfiles(profileIds);
				await UserService.softDeletePublicContentForProfiles(profileIds);
				await UserService.bulkSoftDeleteUsers(profileIds);
				break;

			default:
				break;
		}

		// create delete user events
		let message: string;
		if (currentUser) {
			message = `Gebruiker ${currentUser.first_name} ${currentUser.last_name} heeft een gebruiker verwijderd`;
		} else {
			message = 'Een gebruiker werdt gewist via de delete user API endpoint';
		}
		await EventLoggingService.insertEvents(
			profileIds.map(
				(profileId): LogEvent => ({
					message,
					action: 'delete',
					component: 'server',
					created_at: new Date().toISOString(),
					is_system: false,
					namespace: 'avo',
					object: profileId,
					object_type: 'profile',
					source_url: '',
					occurred_at: new Date().toISOString(),
					subject: currentUser ? currentUser.uid : 'API request',
					subject_type: currentUser ? 'user' : 'system',
					parent_id: null,
					id: undefined,
					subject_ip: null,
					trace_id: null,
				})
			)
		);
	}

	static async bulkUpdateBlockStatus(
		profileIds: string[],
		isBlocked: boolean,
		currentUser: Avo.User.User
	): Promise<void> {
		try {
			await UserService.updateBlockStatusByProfileIds(profileIds, isBlocked);

			// create block/unblock user events
			await EventLoggingService.insertEvents(
				profileIds.map(
					(profileId): LogEvent => ({
						action: isBlocked ? 'activate' : 'deactivate',
						component: 'server',
						created_at: new Date().toISOString(),
						is_system: false,
						message: `Gebruiker ${currentUser.first_name} ${currentUser.last_name} heeft een gebruiker geblokkeerd`,
						namespace: 'avo',
						object: profileId,
						object_type: 'profile',
						source_url: '',
						occurred_at: new Date().toISOString(),
						subject: currentUser.uid,
						subject_type: 'user',
						parent_id: null,
						id: undefined,
						subject_ip: null,
						trace_id: null,
					})
				)
			);

			if (isBlocked) {
				// Send blocked mail
				const userInfos: EmailUserInfo[] = (
					await UserService.getEmailUserInfo(profileIds)
				).filter((info) => !!info.email);

				await promiseUtils.mapLimit(userInfos, 10, async (userInfo) => {
					await CampaignMonitorService.send({
						template: 'blockUser',
						to: userInfo.email,
						data: userInfo,
					});
				});
			}
		} catch (err) {
			throw new CustomError('Failed to bulk update block status for profile ids', err);
		}
	}

	static async getUserInfo(profileId: string): Promise<ProfileBlockEvents> {
		return UserService.getBlockEvents(profileId);
	}
}
