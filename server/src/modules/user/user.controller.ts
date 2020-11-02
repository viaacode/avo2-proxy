import * as promiseUtils from 'blend-promise-utils';

import { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import CampaignMonitorService from '../campaign-monitor/service';
import { EmailUserInfo } from '../campaign-monitor/types';

import UserService from './user.service';
import { UserDeleteOption } from './user.types';

export default class UserController {
	static async bulkDeleteUsers(
		profileIds: string[],
		deleteOption: UserDeleteOption,
		transferToProfileId?: string
	) {
		// Remove them from campaign monitor
		const emailAddresses = await UserService.bulkGetEmails(profileIds);
		await CampaignMonitorService.bulkUnsubscribe(emailAddresses);

		switch (deleteOption) {
			case 'DELETE_PRIVATE_KEEP_NAME':
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.stripUserAccount(profileIds, false);
				break;

			case 'TRANSFER_PUBLIC':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			case 'TRANSFER_ALL':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.transferPrivateContentForProfiles(
					profileIds,
					transferToProfileId
				);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			case 'ANONYMIZE_PUBLIC':
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.stripUserAccount(profileIds, true);
				break;

			case 'DELETE_ALL':
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.deletePublicContentForProfiles(profileIds);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			default:
				break;
		}
	}

	static async bulkUpdateBlockStatus(profileIds: string[], isBlocked: boolean): Promise<void> {
		try {
			await UserService.updateBlockStatusByProfileIds(profileIds, isBlocked);
			if (isBlocked) {
				// Send blocked mail
				const userInfos: EmailUserInfo[] = (await UserService.getEmailUserInfo(profileIds)).filter(info => !!info.email);
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
}
