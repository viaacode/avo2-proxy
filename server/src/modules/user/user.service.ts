import { get } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import DataService from '../data/service';

import {
	BULK_DELETE_USERS,
	BULK_DELETE_USERS_EXCEPT_NAME, BULK_GET_EMAIL_ADDRESSES,
	DELETE_PRIVATE_CONTENT_FOR_PROFILES,
	DELETE_PUBLIC_CONTENT_FOR_PROFILES,
	TRANSFER_PRIVATE_CONTENT_FOR_PROFILES,
	TRANSFER_PUBLIC_CONTENT_FOR_PROFILES,
} from './user.queries.gql';

export default class UserService {
	static async bulkDeleteUsersExceptName(profileIds: string[]): Promise<void> {
		try {
			const response = await DataService.execute(BULK_DELETE_USERS_EXCEPT_NAME, {
				profileIds,
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}
		} catch (err) {
			throw new CustomError('Failed to bulk delete users except their names', err, {
				profileIds,
				query: BULK_DELETE_USERS_EXCEPT_NAME,
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
}
