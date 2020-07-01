import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import {
	BadRequestError,
	CustomError,
	InternalServerError,
} from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import DataService from '../../../data/service';
import ProfileController from '../../../profile/controller';
import AuthController from '../../controller';
import { IdpHelper } from '../../idp-helper';
import { GET_USER_BY_LDAP_UUID } from '../../queries.gql';
import { AuthService } from '../../service';
import { LdapUser, UserGroup } from '../../types';

import { LdapPerson } from './hetarchief.types';

export interface BasicIdpUserInfo {
	first_name: string;
	last_name: string;
	mail: string;
	roles: string[];
}

export default class HetArchiefController {
	public static async getAvoUserInfoFromDatabaseByEmail(
		ldapUserInfo: LdapUser
	): Promise<Avo.User.User> {
		const email = ldapUserInfo.name_id;
		return await AuthService.getAvoUserInfoByEmail(email);
	}

	public static async createUserAndProfile(
		req: Request,
		stamboekNumber: string | null
	): Promise<Avo.User.User> {
		let ldapUserInfo: LdapUser | null = null;
		try {
			ldapUserInfo = IdpHelper.getIdpUserInfoFromSession(req);
			if (!ldapUserInfo) {
				throw new InternalServerError(
					'Failed to create user because ldap object is undefined',
					null
				);
			}

			// Create avo user object
			const ldapUser: BasicIdpUserInfo = HetArchiefController.parseLdapObject(ldapUserInfo);
			const existingUser = await AuthService.getAvoUserInfoByEmail(ldapUser.mail);
			if (existingUser) {
				throw new InternalServerError(
					'Failed to create user because an avo user with this email address already exists',
					null,
					{
						existingUser,
						newUser: ldapUser,
					}
				);
			}
			const userUuid = await AuthController.createUser(ldapUser);

			// Create avo profile object
			await HetArchiefController.createProfile(ldapUserInfo, userUuid, stamboekNumber);

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
				await IdpHelper.createIdpMap(
					'HETARCHIEF',
					ldapUserInfo.attributes.entryUUID[0],
					userUuid
				);
			}

			return AuthService.getAvoUserInfoById(userUuid);
		} catch (err) {
			throw new InternalServerError(
				'Failed to create user and profile in the avo database',
				err,
				{
					stamboekNumber,
					ldapUserInfo,
				}
			);
		}
	}

	public static async getAvoUserInfoFromDatabaseByLdapUuid(
		ldapUuid: string | undefined
	): Promise<Avo.User.User | null> {
		try {
			if (!ldapUuid) {
				throw new BadRequestError('ldapUuid is not defined');
			}
			const response = await DataService.execute(GET_USER_BY_LDAP_UUID, { ldapUuid });
			const avoUser = _.get(response, 'data.users_idp_map[0].local_user');
			if (!avoUser) {
				return null;
			}
			return AuthService.simplifyUserObject(avoUser);
		} catch (err) {
			throw new CustomError('Failed to getAvoUserInfoFromDatabaseByLdapUuid', err, {
				ldapUuid,
			});
		}
	}

	private static async createProfile(
		ldapObject: LdapUser,
		userUid: string,
		stamboekNumber: string
	): Promise<string> {
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

	public static ldapObjectToLdapPerson(ldapObject: LdapUser): Partial<LdapPerson> {
		return {
			first_name: _.get(ldapObject, 'attributes.givenName[0]'),
			last_name: _.get(ldapObject, 'attributes.sn[0]'),
			email: _.get(ldapObject, 'attributes.mail'),
			display_name: _.get(ldapObject, 'attributes.displayName'),
			unit: {
				ou_id: _.get(ldapObject, 'attributes.ou[0]'),
			},
			organization: {
				or_id: _.get(ldapObject, 'attributes.o[0]'),
			},
			employee_nr: _.get(ldapObject, 'attributes.employeeNumber'),
			edu_typename: _.get(ldapObject, 'attributes.x-be-viaa-eduTypeName'),
			edu_levelname: _.get(ldapObject, 'attributes.x-be-viaa-eduLevelName'),
			id: _.get(ldapObject, 'attributes.entryUUID[0]'),
			apps: (_.get(ldapObject, 'attributes.apps') || []).map((app: string) => ({
				name: app,
			})),
			organizational_status: _.get(ldapObject, 'attributes.organizationalStatus'),
		};
	}

	public static async updateUser(
		ldapUserInfo: Partial<LdapPerson>,
		avoUser?: Avo.User.User
	): Promise<boolean> {
		let isUpdated = false;
		let avoUserInfo = avoUser;

		if (!avoUserInfo) {
			avoUserInfo = await HetArchiefController.getAvoUserInfoFromDatabaseByLdapUuid(
				ldapUserInfo.id
			);
			if (!avoUserInfo) {
				throw new InternalServerError(
					'Failed to find matching avo user to the provided ldap uuid',
					null,
					{ ldapUuid: ldapUserInfo.id }
				);
			}
		}

		const newAvoUser = _.cloneDeep(avoUserInfo);
		newAvoUser.mail = _.get(ldapUserInfo, 'email[0]') || newAvoUser.mail;
		newAvoUser.first_name = _.get(ldapUserInfo, 'first_name');
		newAvoUser.last_name = _.get(ldapUserInfo, 'last_name');
		newAvoUser.profile.stamboek =
			_.get(ldapUserInfo, 'employee_nr[0]') || newAvoUser.profile.stamboek;
		newAvoUser.profile.alias =
			newAvoUser.profile.alias || _.get(ldapUserInfo, 'display_name[0]');
		newAvoUser.profile.educationLevels =
			_.get(ldapUserInfo, 'edu_levelname') || newAvoUser.profile.educationLevels || [];
		newAvoUser.profile.subjects = newAvoUser.profile.subjects || [];

		if (!ldapUserInfo.apps.find(app => app.name === 'avo')) {
			(newAvoUser as any).is_blocked = true; // TODO remove cast after update to typings 2.20.0
		}

		if (
			_.get(ldapUserInfo, 'organization.or_id') &&
			!newAvoUser.profile.organizations.find((org: any) => {
				return (
					org.organization_id === ldapUserInfo.organization.or_id &&
					org.unit_id === ldapUserInfo.unit.ou_id
				);
			})
		) {
			// Update schools if ldap school is not found in avo list
			newAvoUser.profile.organizations = [
				{
					organizationId: _.get(ldapUserInfo, 'organization.or_id'),
					unitId: _.get(ldapUserInfo, 'unit.ou_id') || null,
				},
			] as any[];
		}

		if (!_.isEqual(newAvoUser, avoUserInfo)) {
			// Something changes => save to database
			isUpdated = true;
			await AuthService.updateAvoUserInfo(newAvoUser);
		}

		isUpdated =
			(await this.updateUserGroups(
				{
					first_name: newAvoUser.first_name,
					last_name: newAvoUser.last_name,
					mail: newAvoUser.mail,
					roles: (_.get(ldapUserInfo, 'organizational_status') || []) as string[],
				},
				newAvoUser
			)) || isUpdated;

		return isUpdated;
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
	public static async updateUserGroups(
		ldapUser: BasicIdpUserInfo,
		avoUser: Avo.User.User
	): Promise<boolean> {
		const allUserGroups = await AuthService.getAllUserGroups();

		const ldapUserGroupsRaw: (UserGroup | undefined)[] = (ldapUser.roles || []).map(role =>
			allUserGroups.find(ug => ug.ldap_role === role)
		);
		const ldapUserGroups: UserGroup[] = _.compact(ldapUserGroupsRaw);

		if (ldapUserGroupsRaw.length !== ldapUserGroups.length) {
			logger.error(
				new CustomError('Failed to map all ldap roles to user groups', null, {
					ldapUser,
					allUserGroups,
					ldapUserGroupsRaw,
					ldapUserGroups,
				})
			);
		}

		const avoUserGroupRaw: (
			| UserGroup
			| undefined
		)[] = avoUser.profile.userGroupIds.map(avoUserGroupId =>
			allUserGroups.find(ug => ug.id === avoUserGroupId)
		);
		const avoUserGroups: UserGroup[] = _.compact(avoUserGroupRaw);

		if (ldapUserGroupsRaw.length !== ldapUserGroups.length) {
			logger.error(
				new CustomError('Failed to map all avo user group ids to user groups', null, {
					avoUser,
					allUserGroups,
					avoUserGroupRaw,
					avoUserGroups,
				})
			);
		}

		// Remove the user groups that are managed by avo without a corresponding role in ldap
		// eg: lesgever secundair, student lesgever secundair
		const avoUserGroupsFiltered = avoUserGroups.filter(ug => ug.ldap_role !== null);
		const avoUserGroupIdsOther = avoUserGroups
			.filter(ug => ug.ldap_role === null)
			.map(ug => ug.id);

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

		await ProfileController.updateUserGroupsSecondaryEducation(
			_.uniq([...ldapUserGroupIds, ...avoUserGroupIdsOther]),
			profileId,
			_.get(avoUser, 'profile.educationLevels', [])
		);

		return !!addedUserGroupIds.length || !!deletedUserGroupIds.length;
	}
}
