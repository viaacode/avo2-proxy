import * as promiseUtils from 'blend-promise-utils';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import DataService from '../data/service';
import { ClientEducationOrganization } from '../education-organizations/route';
import EducationOrganizationsService, {
	LdapEducationOrganization,
} from '../education-organizations/service';

import {
	GET_USER_GROUPS,
	GET_USER_INFO_BY_ID,
	GET_USER_INFO_BY_USER_EMAIL,
	LINK_USER_GROUPS_TO_PROFILE,
	UNLINK_USER_GROUP_FROM_PROFILE,
	UPDATE_AVO_USER,
	UPDATE_USER_LAST_ACCESS_DATE,
} from './queries.gql';
import { SharedUser, UserGroup } from './types';
import ProfileController from '../profile/controller';

export class AuthService {
	public static async getAvoUserInfoByEmail(email: string): Promise<Avo.User.User> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_USER_EMAIL, { email });
			if (response.errors) {
				throw new InternalServerError(
					'Failed to get user info from graphql by user email',
					null,
					{ email, errors: response.errors }
				);
			}
			const user: SharedUser = _.get(response, 'data.users[0]', null);
			return this.simplifyUserObject(user);
		} catch (err) {
			throw new InternalServerError(
				'Failed to get user info from graphql by user email',
				err,
				{ email }
			);
		}
	}

	public static async getAvoUserInfoById(userId: string): Promise<Avo.User.User> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_ID, { userId });
			if (response.errors) {
				throw new ExternalServerError(
					'Failed to get user info from graphql by user uid',
					null,
					{ userId, errors: response.errors }
				);
			}
			const user: SharedUser = _.get(response, 'data.users[0]', null);
			return this.simplifyUserObject(user);
		} catch (err) {
			throw new InternalServerError('Failed to get user info from graphql by user uid', err, {
				userId,
			});
		}
	}

	public static async simplifyUserObject(user: SharedUser | null): Promise<Avo.User.User> {
		try {
			if (!user) {
				return null;
			}
			// Simplify user object structure
			(user as any).profile = user.profiles[0] || ({} as Avo.User.Profile);
			const permissions = new Set<string>();
			const userGroupIds: number[] = [];
			_.get(user, 'profiles[0].profile_user_groups', []).forEach((profileUserGroup: any) => {
				_.get(profileUserGroup, 'groups', []).forEach((userGroup: any) => {
					userGroupIds.push(userGroup.id);
					_.get(userGroup, 'group_user_permission_groups', []).forEach(
						(permissionGroup: any) => {
							_.get(
								permissionGroup,
								'permission_group.permission_group_user_permissions',
								[]
							).forEach((permission: any) => {
								permissions.add(permission.permission.label);
							});
						}
					);
				});
			});
			(user as any).profile.userGroupIds = userGroupIds;
			(user as any).profile.permissions = Array.from(permissions);
			(user as any).idpmaps = _.uniq((user.idpmaps || []).map(obj => obj.idp));
			delete user.profiles;
			delete (user as any).profile.profile_user_groups;

			// Simplify linked objects
			(user as any).profile.educationLevels = (_.get(
				user,
				'profile.profile_contexts',
				[]
			) as { key: string }[]).map(context => context.key);
			(user as any).profile.subjects = (_.get(
				user,
				'profile.profile_classifications',
				[]
			) as { key: string }[]).map(classification => classification.key);
			(user as any).profile.organizations = _.compact(
				await promiseUtils.mapLimit(
					_.get(user, 'profile.profile_organizations', []),
					5,
					async (org): Promise<ClientEducationOrganization> => {
						const ldapOrg: LdapEducationOrganization = await EducationOrganizationsService.getOrganization(
							org.organization_id,
							org.unit_id
						);
						if (!ldapOrg) {
							return null;
						}
						const unitAddress = _.get(
							(ldapOrg.units || []).find(unit => unit.id === org.unit_id),
							'address',
							null
						);
						return {
							organizationId: org.organization_id,
							unitId: org.unit_id,
							label: ldapOrg.name + (unitAddress ? ` - ${unitAddress}` : ''),
						};
					}
				)
			);
			delete (user as any).profile.profile_contexts;
			delete (user as any).profile.profile_classifications;
			delete (user as any).profile.profile_organizations;
			return (user as unknown) as Avo.User.User;
		} catch (err) {
			throw new CustomError('Failed to simplify user object', err, { user });
		}
	}

	static async addUserGroupsToProfile(userGroupIds: number[], profileId: string) {
		try {
			const response = await DataService.execute(LINK_USER_GROUPS_TO_PROFILE, {
				objects: userGroupIds.map(userGroupId => ({
					user_group_id: userGroupId,
					user_profile_id: profileId,
				})),
			});
			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to add usergroups to profile', err, {
				userGroupIds,
				profileId,
				query: 'LINK_USER_GROUPS_TO_PROFILE',
			});
		}
	}

	static async updateUserLastAccessDate(userUid: string): Promise<void> {
		try {
			const response = await DataService.execute(UPDATE_USER_LAST_ACCESS_DATE, {
				userUid,
				date: new Date().toISOString(),
			});
			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to update user last access date', err, {
				userUid,
				query: 'UPDATE_USER_LAST_ACCESS_DATE',
			});
		}
	}

	static async removeUserGroupsFromProfile(userGroupIds: number[], profileId: string) {
		try {
			const response = await DataService.execute(UNLINK_USER_GROUP_FROM_PROFILE, {
				userGroupIds,
				profileId,
			});
			if (response.errors) {
				throw new CustomError('response contains errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to remove usergroup from profile', err, {
				userGroupIds,
				profileId,
			});
		}
	}

	static async getAllUserGroups(): Promise<UserGroup[]> {
		try {
			const response = await DataService.execute(GET_USER_GROUPS);

			if (response.errors) {
				throw new CustomError('Response contains errors', null, { response });
			}

			return _.get(response, 'data.users_groups', []);
		} catch (err) {
			throw new CustomError('Failed to get user groups from the database', err, {
				query: GET_USER_GROUPS,
			});
		}
	}

	static async updateAvoUserInfo(avoUser: Avo.User.User): Promise<void> {
		try {
			const updatedUser = _.cloneDeep(avoUser);
			delete updatedUser.uid;
			delete updatedUser.profile;
			delete updatedUser.idpmaps;
			delete updatedUser.role;
			updatedUser.updated_at = new Date().toISOString();

			const response = await DataService.execute(UPDATE_AVO_USER, {
				uid: avoUser.uid,
				user: updatedUser,
			});

			if (response.errors) {
				throw new CustomError('Graphql response contains errors', null, { response });
			}

			// Update profile
			await ProfileController.updateProfile(avoUser.profile, {});
		} catch (err) {
			throw new CustomError('Failed to update avo user info', err, { avoUser });
		}
	}
}
