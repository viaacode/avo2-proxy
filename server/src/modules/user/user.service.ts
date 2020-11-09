import * as promiseUtils from 'blend-promise-utils';
import { get } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import i18n from '../../shared/translations/i18n';
import { EmailUserInfo } from '../campaign-monitor/campaign-monitor.types';
import DataService from '../data/service';

import {
	BULK_DELETE_USERS,
	BULK_GET_EMAIL_ADDRESSES,
	BULK_STRIP_USERS,
	BULK_UPDATE_USER_BLOCKED_STATUS_BY_PROFILE_IDS,
	DELETE_PRIVATE_CONTENT_FOR_PROFILES,
	DELETE_PUBLIC_CONTENT_FOR_PROFILES,
	GET_EMAIL_USER_INFO,
	TRANSFER_PRIVATE_CONTENT_FOR_PROFILES,
	TRANSFER_PUBLIC_CONTENT_FOR_PROFILES,
	UPDATE_MAIL,
	UPDATE_NAME_AND_MAIL,
} from './user.queries.gql';

export default class UserService {
	/**
	 * Deletes all linked objects of the user account except content
	 * eg: organisations, subjects, education levels, idp maps, roles
	 * Also nulls any fields that are not the first_name or last_name of the user
	 * Sets the email address to <user_id>@hetarchief.be
	 * @param profileIds
	 * @param anonymize if true, sets first_name to "Anonieme" and last_name to "gebruiker"
	 */
	static async stripUserAccount(profileIds: string[], anonymize: boolean): Promise<void> {
		try {
			const response = await DataService.execute(BULK_STRIP_USERS, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}

			if (anonymize) {
				await promiseUtils.mapLimit(profileIds, 10, async (profileId: string) =>
					UserService.updateNameAndEmail(profileId, anonymize)
				);
			}
		} catch (err) {
			throw new CustomError('Failed to bulk delete users except their names', err, {
				profileIds,
				query: BULK_STRIP_USERS,
			});
		}
	}

	static async updateNameAndEmail(profileId: string, anonymize: boolean): Promise<void> {
		try {
			const response = await DataService.execute(
				anonymize ? UPDATE_NAME_AND_MAIL : UPDATE_MAIL,
				anonymize
					? {
						profileId,
						firstName: i18n.t('Anonieme'),
						lastName: i18n.t('gebruiker'),
						mail: `${profileId}@hetarchief.be`,
					}
					: {
						profileId,
						mail: `${profileId}@hetarchief.be`,
					}
			);

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}
		} catch (err) {
			throw new CustomError('Failed to update name and mail for profile id', err, {
				profileId,
				anonymize,
				query: anonymize ? UPDATE_NAME_AND_MAIL : UPDATE_MAIL,
			});
		}
	}

	static async bulkDeleteUsers(profileIds: string[]): Promise<void> {
		try {
			const response = await DataService.execute(BULK_DELETE_USERS, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}
		} catch (err) {
			throw new CustomError('Failed to bulk delete users', err, {
				profileIds,
				query: BULK_DELETE_USERS,
			});
		}
	}

	static async bulkGetEmails(profileIds: string[]): Promise<string[]> {
		try {
			const response = await DataService.execute(BULK_GET_EMAIL_ADDRESSES, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}

			return get(response, 'shared_users', []).map((user: Avo.User.User) => user.mail);
		} catch (err) {
			throw new CustomError('Failed to bulk get email adresses', err, {
				profileIds,
				query: BULK_GET_EMAIL_ADDRESSES,
			});
		}
	}

	/**
	 * Delete all public content for the given users: collections, bundles, content pages. And all linked objects to those items
	 * @param profileIds the profile ids for which to delete the content
	 */
	static async deletePublicContentForProfiles(profileIds: string[]): Promise<void> {
		try {
			const response = await DataService.execute(DELETE_PUBLIC_CONTENT_FOR_PROFILES, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to bulk delete public content for profile ids', err, {
				profileIds,
				query: DELETE_PUBLIC_CONTENT_FOR_PROFILES,
			});
		}
	}

	/**
	 * Delete all private content for the given users: collections, bundles, bookmarks, assignments, content pages. And all linked objects to those items
	 * @param profileIds the profile ids for which to delete the content
	 */
	static async deletePrivateContentForProfiles(profileIds: string[]): Promise<void> {
		try {
			const response = await DataService.execute(DELETE_PRIVATE_CONTENT_FOR_PROFILES, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to bulk delete private content for profile ids', err, {
				profileIds,
				query: DELETE_PRIVATE_CONTENT_FOR_PROFILES,
			});
		}
	}

	/**
	 * Transfer all public content for the specified users to specified user
	 * @param profileIds the profile ids to transfer the public content from
	 * @param transferToProfileId the profile id to transfer the content to
	 */
	static async transferPublicContentForProfiles(
		profileIds: string[],
		transferToProfileId: string
	): Promise<void> {
		try {
			const response = await DataService.execute(TRANSFER_PUBLIC_CONTENT_FOR_PROFILES, {
				profileIds,
				transferToProfileId,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError(
				'Failed to bulk transfer public content for profile ids to other profile id',
				err,
				{
					profileIds,
					query: TRANSFER_PUBLIC_CONTENT_FOR_PROFILES,
				}
			);
		}
	}

	/**
	 * Transfer all private content for the specified users to specified user
	 * @param profileIds the profile ids to transfer the public content from
	 * @param transferToProfileId the profile id to transfer the content to
	 */
	static async transferPrivateContentForProfiles(
		profileIds: string[],
		transferToProfileId: string
	): Promise<void> {
		try {
			const response = await DataService.execute(TRANSFER_PRIVATE_CONTENT_FOR_PROFILES, {
				profileIds,
				transferToProfileId,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError(
				'Failed to bulk transfer private content for profile ids to other profile id',
				err,
				{
					profileIds,
					query: TRANSFER_PRIVATE_CONTENT_FOR_PROFILES,
				}
			);
		}
	}

	static async updateBlockStatusByProfileIds(
		profileIds: string[],
		isBlocked: boolean
	): Promise<void> {
		try {
			const response = await DataService.execute(
				BULK_UPDATE_USER_BLOCKED_STATUS_BY_PROFILE_IDS,
				{
					profileIds,
					isBlocked,
				}
			);

			if (response.errors) {
				throw new CustomError('Response from gragpql contains errors', null, {
					response,
				});
			}
		} catch (err) {
			throw new CustomError(
				'Failed to update is_blocked field for users in the database',
				err,
				{
					profileIds,
					isBlocked,
					query: BULK_UPDATE_USER_BLOCKED_STATUS_BY_PROFILE_IDS,
				}
			);
		}
	}

	static async getEmailUserInfo(profileIds: string[]): Promise<EmailUserInfo[]> {
		try {
			const response = await DataService.execute(GET_EMAIL_USER_INFO, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('Response from gragpql contains errors', null, {
					response,
				});
			}

			return (get(response, 'data.users_profiles') || []).map(
				(profile: any): EmailUserInfo => ({
					email: get(profile, 'user.mail', '-'),
					UserGroup: get(profile, 'profile_user_group.group.label', '-'),
				})
			);
		} catch (err) {
			throw new CustomError('Failed to get email user info for users in the database', err, {
				profileIds,
				query: GET_EMAIL_USER_INFO,
			});
		}
	}
}
