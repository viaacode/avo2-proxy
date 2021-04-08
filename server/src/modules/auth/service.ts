import * as promiseUtils from 'blend-promise-utils';
import { cloneDeep, compact, get, uniq } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { PermissionName } from '../../shared/permissions';
import DataService from '../data/data.service';
import EducationOrganizationsService, {
	LdapEducationOrganizationWithUnits,
	SimpleOrgInfo,
} from '../education-organizations/service';
import ProfileController from '../profile/controller';

import HetArchiefService from './idps/het-archief/het-archief.service';
import {
	GET_USER_GROUPS,
	GET_USER_INFO_BY_ID,
	GET_USER_INFO_BY_USER_EMAIL,
	LINK_USER_GROUPS_TO_PROFILE,
	UNLINK_ALL_USER_GROUPS_FROM_PROFILE,
	UPDATE_AVO_USER,
	UPDATE_USER_LAST_ACCESS_DATE,
} from './queries.gql';
import { SharedUser, UserGroup } from './types';

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
			const user: SharedUser = get(response, 'data.users[0]', null);
			return AuthService.simplifyUserObject(user);
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
			const user: SharedUser = get(response, 'data.users[0]', null);
			return AuthService.simplifyUserObject(user);
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
			((user as unknown) as Avo.User.User).profile = (user.profile || {}) as Avo.User.Profile;
			const permissions = new Set<string>();
			const userGroupIds: number[] = [];
			const userGroup = get(user, 'profile.profile_user_group.group');
			if (userGroup) {
				userGroupIds.push(userGroup.id);
				get(userGroup, 'group_user_permission_groups', []).forEach(
					(permissionGroup: any) => {
						get(
							permissionGroup,
							'permission_group.permission_group_user_permissions',
							[]
						).forEach((permission: any) => {
							permissions.add(permission.permission.label);
						});
					}
				);
			}
			(user as any).profile.userGroupIds = userGroupIds;
			(user as any).profile.permissions = Array.from(permissions);
			(user as any).idpmapObjects = user.idpmaps;
			(user as any).idpmaps = uniq((user.idpmaps || []).map((obj) => obj.idp));
			delete (user as any).profile.profile_user_group;

			// Simplify linked objects
			(user as any).profile.educationLevels = (get(user, 'profile.profile_contexts', []) as {
				key: string;
			}[]).map((context) => context.key);
			(user as any).profile.subjects = uniq(
				(get(user, 'profile.profile_classifications', []) as {
					key: string;
				}[]).map((classification) => classification.key)
			);
			(user as any).profile.organizations = compact(
				await promiseUtils.mapLimit(
					get(user, 'profile.profile_organizations', []),
					5,
					async (org): Promise<Avo.EducationOrganization.Organization> => {
						const ldapOrg: LdapEducationOrganizationWithUnits = await EducationOrganizationsService.getOrganization(
							org.organization_id,
							org.unit_id
						);
						if (!ldapOrg) {
							return null;
						}
						const unitAddress = get(
							(ldapOrg.units || []).find((unit) => unit.id === org.unit_id),
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
				objects: userGroupIds.map((userGroupId) => ({
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

	static async removeAllUserGroupsFromProfile(profileId: string) {
		try {
			const response = await DataService.execute(UNLINK_ALL_USER_GROUPS_FROM_PROFILE, {
				profileId,
			});
			if (response.errors) {
				throw new CustomError('response contains errors', null, { response });
			}
		} catch (err) {
			throw new CustomError('Failed to remove all usergroup from profile', err, {
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

			return get(response, 'data.users_groups', []);
		} catch (err) {
			throw new CustomError('Failed to get user groups from the database', err, {
				query: GET_USER_GROUPS,
			});
		}
	}

	static async updateAvoUserInfo(avoUser: Avo.User.User): Promise<void> {
		try {
			const updatedUser = cloneDeep(avoUser);
			delete updatedUser.uid;
			delete updatedUser.profile;
			delete updatedUser.idpmaps;
			delete updatedUser.role;
			delete (updatedUser as any).idpmapObjects;
			updatedUser.updated_at = new Date().toISOString();

			const response = await DataService.execute(UPDATE_AVO_USER, {
				uid: avoUser.uid,
				user: updatedUser,
			});

			if (response.errors) {
				throw new CustomError('Graphql response contains errors', null, { response });
			}

			// Update profile
			await ProfileController.updateProfile(avoUser, {
				company_id: avoUser.profile.company_id,
			});
		} catch (err) {
			throw new CustomError('Failed to update avo user info', err, { avoUser });
		}
	}

	static async updateLdapUserInfo(avoUser: Avo.User.User, ldapEntryUuid: string): Promise<void> {
		try {
			const orgs: SimpleOrgInfo[] = get(avoUser, 'profile.organizations') || [];
			const educationLevels = get(avoUser, 'profile.educationLevels') || [];

			// Resolve org id en unit id to uuids since the ldap api expects those
			const orgUuids: string[] = [];
			const unitUuids: string[] = [];
			if (orgs.length) {
				await promiseUtils.mapLimit(orgs, 10, async (simpleOrgInfo: SimpleOrgInfo) => {
					const fullOrgInfo: LdapEducationOrganizationWithUnits | null = await EducationOrganizationsService.getOrganization(
						simpleOrgInfo.organizationId,
						simpleOrgInfo.unitId
					);
					if (fullOrgInfo) {
						orgUuids.push(fullOrgInfo.id);
						const unitUuid = get(
							fullOrgInfo.units.find((unit) => unit.ou_id === simpleOrgInfo.unitId),
							'id'
						);
						if (unitUuid) {
							unitUuids.push(unitUuid);
						}
					}
				});
			}

			// Update first and last name
			const companyId = avoUser.profile.company_id;
			await HetArchiefService.setLdapUserInfo(ldapEntryUuid, {
				organizations: [...orgUuids, ...(companyId ? [companyId] : [])],
				units: unitUuids,
				edu_levelname: educationLevels,
				first_name: avoUser.first_name,
				last_name: avoUser.last_name,
				external_id: avoUser.uid,
			});
		} catch (err) {
			throw new InternalServerError('Failed to update user info in ldap', err, {
				avoUserId: get(avoUser, 'uid'),
			});
		}
	}

	static hasPermission(user: Avo.User.User, permissionName: PermissionName): boolean {
		return get(user, 'profile.permissions', []).includes(permissionName);
	}
}
