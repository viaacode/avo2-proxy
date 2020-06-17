import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import DataService from '../../../data/service';
import AuthController from '../../controller';
import { IdpHelper } from '../../idp-helper';
import { GET_USER_BY_LDAP_UUID } from '../../queries.gql';
import { AuthService } from '../../service';
import { LdapUser, UserGroup } from '../../types';

export interface BasicIdpUserInfo {
	first_name: string;
	last_name: string;
	mail: string;
	roles: string[];
}

export default class HetArchiefController {
	public static async getAvoUserInfoFromDatabaseByEmail(ldapUserInfo: LdapUser): Promise<Avo.User.User> {
		const email = ldapUserInfo.name_id;
		return await AuthService.getAvoUserInfoByEmail(email);
	}

	public static async createUserAndProfile(req: Request, stamboekNumber: string | null): Promise<Avo.User.User> {
		let ldapUserInfo: LdapUser | null = null;
		try {
			ldapUserInfo = IdpHelper.getIdpUserInfoFromSession(req);
			if (!ldapUserInfo) {
				throw new InternalServerError('Failed to create user because ldap object is undefined', null);
			}

			// Create avo user object
			const ldapUser: BasicIdpUserInfo = this.parseLdapObject(ldapUserInfo);
			const existingUser = await AuthService.getAvoUserInfoByEmail(ldapUser.mail);
			if (existingUser) {
				throw new InternalServerError(
					'Failed to create user because an avo user with this email address already exists',
					null,
					{
						existingUser,
						newUser: ldapUser,
					});
			}
			const userUuid = await AuthController.createUser(ldapUser);

			// Create avo profile object
			await this.createProfile(ldapUserInfo, userUuid, stamboekNumber);

			const userInfo: Avo.User.User = await AuthService.getAvoUserInfoById(userUuid);
			IdpHelper.setAvoUserInfoOnSession(req, userInfo);

			// Check if user is linked to hetarchief idp, if not create a link in the idp_map table
			if (!(userInfo.idpmaps || []).includes('HETARCHIEF')) {
				const ldapUuid = ldapUserInfo.attributes.entryUUID[0];
				if (!ldapUuid) {
					throw new CustomError(
						'Failed to link user to hetarchief ldap because ldap user does not have uuid',
						null,
						{
							ldapUserInfo,
							userUuid,
						}
					);
				}
				await IdpHelper.createIdpMap('HETARCHIEF', ldapUserInfo.attributes.entryUUID[0], userUuid);
			}

			return AuthService.getAvoUserInfoById(userUuid);
		} catch (err) {
			throw new InternalServerError('Failed to create user and profile in the avo database', err, {
				stamboekNumber,
				ldapUserInfo,
			});
		}
	}

	public static async getAvoUserInfoFromDatabaseByLdapUuid(ldapUuid: string | undefined): Promise<Avo.User.User | null> {
		try {
			const response = await DataService.execute(GET_USER_BY_LDAP_UUID, { ldapUuid });
			const avoUser = _.get(response, 'data.users_idp_map[0].local_user');
			if (!avoUser) {
				return null;
			}
			return AuthService.simplifyUserObject(avoUser);
		} catch (err) {
			throw new CustomError(
				'Failed to getAvoUserInfoFromDatabaseByLdapUuid',
				err,
				{ ldapUuid }
			);
		}
	}

	private static async createProfile(ldapObject: LdapUser, userUid: string, stamboekNumber: string): Promise<string> {
		const profile: Partial<Avo.User.Profile> = {
			alternative_email: _.get(ldapObject, 'attributes.mail[0]', ''),
			user_id: userUid,
			stamboek: stamboekNumber,
		};
		return AuthController.createProfile(profile);
	}

	public static parseLdapObject(ldapObject: LdapUser): BasicIdpUserInfo {
		return {
			first_name: _.get(ldapObject, 'attributes.givenName[0]', ''),
			last_name: _.get(ldapObject, 'attributes.sn[0]', ''),
			mail: _.get(ldapObject, 'attributes.mail[0]', ''),
			roles: _.get(ldapObject, 'attributes.organizationalStatus', []),
		};
	}

	/**
	 * Ldap has organizational statuses
	 * Avo has user groups
	 * Every organizational status in ldap has a corresponding user group in avo
	 * In avo you can create more user groups, that do not exist in ldap (because they are avo specific)
	 * 		currently you cannot link users to these user groups
	 * User groups are updated on every login of the user, so they stay in sync with ldap
	 * 		user groups have a column: idp_role, this column specifies if the usergroup has a counterpart in ldap
	 * 		When syncing organizational statuses with ldap,
	 * 		we do not touch the user groups that are already present on the avo userprofile that have their ipd role set to null
	 * @param ldapUser
	 * @param avoUser
	 * @return boolean returns true if the user groups had to be modified, returns false if they were already in sync with ldap
	 */
	public static async updateUserGroups(ldapUser: LdapUser, avoUser: Avo.User.User): Promise<boolean> {
		const parsedLdapUser: BasicIdpUserInfo = HetArchiefController.parseLdapObject(ldapUser);
		const allUserGroups = await AuthService.getAllUserGroups();

		const ldapUserGroupsRaw: (UserGroup | undefined)[] = (parsedLdapUser.roles || []).map(role =>
			allUserGroups.find(ug => ug.ldap_role === role)
		);
		const ldapUserGroups: UserGroup[] = _.compact(ldapUserGroupsRaw);

		if (ldapUserGroupsRaw.length !== ldapUserGroups.length) {
			logger.error(new CustomError('Failed to map all ldap roles to user groups', null, {
				ldapUser,
				allUserGroups,
				ldapUserGroupsRaw,
				ldapUserGroups,
			}));
		}

		const avoUserGroupRaw: (UserGroup | undefined)[] = avoUser.profile.userGroupIds.map(avoUserGroupId =>
			allUserGroups.find(ug => ug.id === avoUserGroupId)
		);
		const avoUserGroups: UserGroup[] = _.compact(avoUserGroupRaw);

		if (ldapUserGroupsRaw.length !== ldapUserGroups.length) {
			logger.error(new CustomError('Failed to map all avo user group ids to user groups', null, {
				avoUser,
				allUserGroups,
				avoUserGroupRaw,
				avoUserGroups,
			}));
		}

		// Remove the user groups that are managed by avo without a corresponding role in ldap
		// eg: lesgever secundair, student lesgever secundair
		const avoUserGroupsFiltered = avoUserGroups.filter(ug => ug.ldap_role !== null);

		// Update user groups:
		const ldapUserGroupIds = _.uniq(ldapUserGroups.map(ug => ug.id));
		const avoUserGroupIds = _.uniq(avoUserGroupsFiltered.map(ug => ug.id));

		const addedUserGroupIds = _.without(ldapUserGroupIds, ...avoUserGroupIds);
		const deletedUserGroupIds = _.without(avoUserGroupIds, ...ldapUserGroupIds);

		const profileId = _.get(avoUser, 'profile.id');
		if (!profileId) {
			throw new CustomError(
				'Failed to update user groups because the profile does not have an id',
				null,
				{ avoUser }
			);
		}
		if (addedUserGroupIds.length || deletedUserGroupIds.length) {
			await Promise.all([
				AuthService.addUserGroupsToProfile(addedUserGroupIds, profileId),
				AuthService.removeUserGroupsFromProfile(deletedUserGroupIds, profileId),
			]);
		}

		return !!addedUserGroupIds.length || !!deletedUserGroupIds.length;
	}
}
