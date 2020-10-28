import CampaignMonitorService from '../campaign-monitor/service';

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
				await UserService.bulkDeleteUsersExceptName(profileIds);
				break;

			case 'TRANSFER_PUBLIC':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			case 'TRANSFER_ALL':
				await UserService.transferPrivateContentForProfiles(
					profileIds,
					transferToProfileId
				);
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			case 'ANONYMIZE_PUBLIC':
				await UserService.transferPublicContentForProfiles(profileIds, transferToProfileId);
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.bulkDeleteUsers(profileIds);
				break;

			case 'DELETE_ALL':
				await UserService.deletePrivateContentForProfiles(profileIds);
				await UserService.deletePublicContentForProfiles(profileIds);
				await UserService.bulkDeleteUsers(profileIds);
				break;
		}
	}
}
