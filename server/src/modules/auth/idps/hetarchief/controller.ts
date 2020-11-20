import { Request } from 'express';
import { cloneDeep, compact, get, isEqual, uniq, without } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import {
	BadRequestError,
	CustomError,
	InternalServerError,
} from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import CampaignMonitorController from '../../../campaign-monitor/campaign-monitor.controller';
import DataService from '../../../data/data.service';
import EducationOrganizationsService, {
	LdapEducationOrganisation,
	LdapEduOrgUnit,
} from '../../../education-organizations/service';
import EventLoggingController from '../../../event-logging/controller';
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
	public static async createUserAndProfile(
		ldapUserInfo: Partial<LdapPerson> | null,
		stamboekNumber: string | null
	): Promise<Avo.User.User> {
		try {
			if (!ldapUserInfo) {
				throw new InternalServerError(
					'Failed to create user because ldap object is undefined',
					null
				);
			}

			// Create avo user object
			const existingUser = await AuthService.getAvoUserInfoByEmail(ldapUserInfo.email[0]);
			if (existingUser) {
				throw new InternalServerError(
					'Failed to create user because an avo user with this email address already exists',
					null,
					{
						existingUser,
						newUser: ldapUserInfo,
					}
				);
			}
			const userUuid = await AuthController.createUser({
				first_name: ldapUserInfo.first_name,
				last_name: ldapUserInfo.last_name,
				mail: ldapUserInfo.email[0],
				roles: ldapUserInfo.organizational_status,
			});

			// Create avo profile object
			await HetArchiefController.createProfile(ldapUserInfo, userUuid, stamboekNumber);

			const userInfo: Avo.User.User = await AuthService.getAvoUserInfoById(userUuid);

			// Check if user is linked to hetarchief idp, if not create a link in the idp_map table
			if (!(userInfo.idpmaps || []).includes('HETARCHIEF')) {
				if (!ldapUserInfo.id) {
					throw new CustomError(
						'Failed to link user to hetarchief ldap because ldap user does not have uuid',
						null,
						{
							ldapUserInfo,
							userUuid,
						}
					);
				}
				await IdpHelper.createIdpMap('HETARCHIEF', ldapUserInfo.id, userUuid);
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
			const avoUser = get(response, 'data.users_idp_map[0].local_user');
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
		ldapUserInfo: Partial<LdapPerson>,
		userUid: string,
		stamboekNumber: string
	): Promise<string> {
		const profile: Partial<Avo.User.Profile> = {
			alternative_email: get(ldapUserInfo, 'email[0]', ''),
			user_id: userUid,
			stamboek: stamboekNumber,
		};
		return AuthController.createProfile(profile);
	}

	public static parseLdapObject(ldapObject: LdapUser): BasicIdpUserInfo {
		return {
			first_name: get(ldapObject, 'attributes.givenName[0]', ''),
			last_name: get(ldapObject, 'attributes.sn[0]', ''),
			mail: get(ldapObject, 'attributes.mail[0]', ''),
			roles: (get(ldapObject, 'attributes.organizationalStatus') || []).map((role: string) =>
				role.toLowerCase()
			),
		};
	}

	public static ldapObjectToLdapPerson(ldapObject: LdapUser): Partial<LdapPerson> {
		return {
			first_name: get(ldapObject, 'attributes.givenName[0]'),
			last_name: get(ldapObject, 'attributes.sn[0]'),
			email: get(ldapObject, 'attributes.mail'),
			display_name: get(ldapObject, 'attributes.displayName'),
			educationalOrganisationUnitIds: get(ldapObject, 'attributes.ou'),
			educationalOrganisationIds: get(ldapObject, 'attributes.o'),
			employee_nr: get(ldapObject, 'attributes.employeeNumber'),
			edu_typename: get(ldapObject, 'attributes.x-be-viaa-eduTypeName'),
			edu_levelname: get(ldapObject, 'attributes.x-be-viaa-eduLevelName'),
			id: get(ldapObject, 'attributes.entryUUID[0]'),
			apps: (get(ldapObject, 'attributes.apps') || []).map((app: string) => ({
				name: app,
			})),
			organizational_status: (
				get(ldapObject, 'attributes.organizationalStatus') || []
			).map((status: string) => status.toLowerCase()),
			role: get(ldapObject, 'attributes.role'),
			sector: get(ldapObject, 'attributes.sector'),
			exception_account: get(ldapObject, 'attributes.x-be-viaa-eduExceptionAccount'),
		};
	}

	public static async createOrUpdateUser(
		ldapUserInfo: Partial<LdapPerson>,
		avoUser: Avo.User.User | null,
		request: Request
	): Promise<Avo.User.User> {
		let avoUserInfo = avoUser;

		if (!avoUserInfo) {
			avoUserInfo = await HetArchiefController.getAvoUserInfoFromDatabaseByLdapUuid(
				ldapUserInfo.id
			);
			if (!avoUserInfo) {
				// No avo user exists yet and this call isn't part of a registration flow
				// Check if ldap user has the avo group
				if (!!(ldapUserInfo.apps || []).find((app) => app.name === 'avo')) {
					// Create the avo user for this ldap account
					avoUserInfo = await HetArchiefController.createUserAndProfile(
						ldapUserInfo,
						null
					);

					EventLoggingController.insertEvent(
						{
							object: avoUserInfo.uid,
							object_type: 'account',
							message: `${get(avoUserInfo, 'first_name')} ${get(
								avoUserInfo,
								'last_name'
							)} heeft zijn account aangemaakt`,
							action: 'create',
							subject: avoUserInfo.uid,
							subject_type: 'user',
							occurred_at: new Date().toISOString(),
							source_url: process.env.HOST + request.path,
						},
						request
					);

					EventLoggingController.insertEvent(
						{
							object: avoUserInfo.uid,
							object_type: 'profile',
							message: `${get(avoUserInfo, 'first_name')} ${get(
								avoUserInfo,
								'last_name'
							)} heeft zijn profiel aangemaakt`,
							action: 'create',
							subject: avoUserInfo.uid,
							subject_type: 'user',
							occurred_at: new Date().toISOString(),
							source_url: process.env.HOST + request.path,
						},
						request
					);
				}
			}
			if (!avoUserInfo) {
				throw new InternalServerError(
					'Failed to find matching avo user to the provided ldap uuid',
					null,
					{ ldapUuid: ldapUserInfo.id }
				);
			}
		}

		let newAvoUser = cloneDeep(avoUserInfo);
		newAvoUser.mail = get(ldapUserInfo, 'email[0]');
		newAvoUser.first_name = get(ldapUserInfo, 'first_name');
		newAvoUser.last_name = get(ldapUserInfo, 'last_name');
		newAvoUser.role_id = await AuthController.getRoleId(
			get(ldapUserInfo, 'organizational_status[0]')
		);
		newAvoUser.profile.stamboek = get(ldapUserInfo, 'employee_nr[0]', null);
		newAvoUser.profile.alias = newAvoUser.profile.alias || get(ldapUserInfo, 'display_name[0]');
		newAvoUser.profile.educationLevels = get(ldapUserInfo, 'edu_levelname') || [];
		newAvoUser.profile.subjects = uniq(newAvoUser.profile.subjects || []);
		(newAvoUser.profile as any).is_exception =
			get(ldapUserInfo, 'exception_account[0]') === 'TRUE';

		newAvoUser.is_blocked = newAvoUser.is_blocked || !ldapUserInfo.apps.find((app) => app.name === 'avo');

		const orgIds: string[] =
			get(ldapUserInfo, 'educationalOrganisationIds') ||
			get(ldapUserInfo, 'organizations', []).map(
				(org: LdapEducationOrganisation) => org.or_id
			);
		const orgUnitIds: string[] =
			get(ldapUserInfo, 'educationalOrganisationUnitIds') ||
			get(ldapUserInfo, 'units', []).map((org: LdapEduOrgUnit) => org.ou_id);
		newAvoUser.profile.organizations = orgIds.map((orgId: string) => {
			return {
				organizationId: orgId,
				unitId: orgUnitIds.find((orgUnitId) => orgUnitId.startsWith(orgId)) || null,
			};
		}) as any[];

		if (orgIds.length === 1) {
			// Check if org has type "School" or something else
			// if something else => set that as the business category
			const orgInfo = await EducationOrganizationsService.getOrganization(
				orgIds[0],
				orgUnitIds[0]
			);
			if (orgInfo.type !== 'School') {
				(newAvoUser.profile as any).business_category = orgInfo.type;
			}
		}

		if (!isEqual(newAvoUser, avoUserInfo)) {
			// Something changes => save to database
			await AuthService.updateAvoUserInfo(newAvoUser);
		}

		newAvoUser = await HetArchiefController.updateUserGroups(
			{
				first_name: newAvoUser.first_name,
				last_name: newAvoUser.last_name,
				mail: newAvoUser.mail,
				roles: (get(ldapUserInfo, 'organizational_status') || []) as string[],
			},
			newAvoUser
		);

		// TODO remove this once https://meemoo.atlassian.net/browse/DEV-1318 is implemented
		// Update campaign monitor lists without waiting for the reply, since it takes longer and it's not critical to the login process
		// Also update existing users if their email changed
		CampaignMonitorController.refreshNewsletterPreferences(newAvoUser, avoUserInfo);

		return newAvoUser;
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
	): Promise<Avo.User.User> {
		try {
			const profileId = get(avoUser, 'profile.id');
			if (!profileId) {
				throw new CustomError(
					'Failed to update user groups because the profile does not have an id',
					null,
					{ avoUser }
				);
			}

			const allUserGroups = await AuthService.getAllUserGroups();

			const ldapUserGroupsRaw: (UserGroup | undefined)[] = (
				ldapUser.roles || []
			).map((role) => allUserGroups.find((ug) => ug.ldap_role === role));
			const ldapUserGroups: UserGroup[] = compact(ldapUserGroupsRaw);

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

			// Update user groups:
			const ldapUserGroupIds = uniq(ldapUserGroups.map((ug) => ug.id));

			await ProfileController.updateUserGroupsSecondaryEducation(
				ldapUserGroupIds[0], // We can only have one user group by decree, the database still handles multiple, but this is deprecated
				profileId,
				get(avoUser, 'profile.educationLevels', [])
			);

			return AuthService.getAvoUserInfoById(avoUser.uid);
		} catch (err) {
			throw new InternalServerError('Failed to update user groups', err, {
				ldapUser,
				avoUser,
			});
		}
	}
}
