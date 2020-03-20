import axios from 'axios';
import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { IdpHelper } from '../../idp-helper';
import { IdpType, LdapUser } from '../../types';
import { AuthService } from '../../service';
import AuthController from '../../controller';
import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import DataService from '../../../data/service';
import { GET_USER_BY_LDAP_UUID } from '../../queries.gql';

export interface BasicIdpUserInfo {
	first_name: string;
	last_name: string;
	mail: string;
	organisation_id: string;
	roles: string[];
}

export default class HetArchiefController {
	public static isLoggedIn(request: Request): boolean {
		const idpType: IdpType | null = IdpHelper.getIdpTypeFromSession(request);
		if (!idpType) {
			return false;
		}
		if (idpType !== 'HETARCHIEF') {
			return false;
		}

		// Check if ldap user object is present on session
		const idpUserInfo: LdapUser | null = IdpHelper.getIdpUserInfoFromSession(request);
		if (!idpUserInfo) {
			return false;
		}
		// Check if the ldap user is expired
		const ldapExpireOn: number = new Date(_.get(idpUserInfo, 'session_not_on_or_after', 0)).getTime();
		if (Date.now() > ldapExpireOn) {
			return false;
		}

		// Check if ldap user has access to avo
		if (!_.get(idpUserInfo, 'attributes.apps', []).includes('avo')) {
			return false;
		}

		// Check if avo user is present on session
		const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
		return !!avoUserInfo;
	}

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
			const profileId = await this.createProfile(ldapUserInfo, userUuid, stamboekNumber);

			// Add the avo app to the list of allowed apps in ldap (this will be done by the ssum in the future)
			await HetArchiefController.addAvoAppToLdap(ldapUserInfo);

			const userInfo: Avo.User.User = await AuthService.getAvoUserInfoById(userUuid);
			IdpHelper.setAvoUserInfoOnSession(req, userInfo);

			// Add permission groups
			const userGroupIds = [];
			if (stamboekNumber) {
				userGroupIds.push(2);
			}
			if (ldapUser.roles && ldapUser.roles.length) {
				// Link ldap user to groups
				const userGroups: { id: number, label: string }[] = await AuthService.getUserGroupsByLdapRoleNames(ldapUser.roles);
				userGroupIds.push(...userGroups.map(ug => ug.id));
			}
			if (userGroupIds.length) {
				await AuthService.addUserGroupsToProfile(_.uniq(userGroupIds), profileId);
			}

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

	private static parseLdapObject(ldapObject: LdapUser): BasicIdpUserInfo {
		return {
			first_name: _.get(ldapObject, 'attributes.givenName[0]', ''),
			last_name: _.get(ldapObject, 'attributes.sn[0]', ''),
			mail: _.get(ldapObject, 'attributes.mail[0]', ''),
			organisation_id: _.get(ldapObject, 'attributes.o[0]', ''),
			roles: _.get(ldapObject, 'attributes.organizationalStatus'),
		};
	}

	private static async addAvoAppToLdap(ldapObject: LdapUser): Promise<void> {
		let url: string = undefined;
		let data: any = undefined;
		try {
			// Request avo be added to ldap apps through ldap api
			const ldapUuid = _.get(ldapObject, 'attributes.entryUUID[0]');
			if (!ldapUuid) {
				throw new InternalServerError('Failed to get uuid from ldap object');
			}
			url = `${process.env.LDAP_API_ENDPOINT}/people/${ldapUuid}`;
			data = {
				apps: [(await AuthService.getLdapApps())['avo']],
			};
			await axios(url, {
				data,
				method: 'put',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
			});
			return;
		} catch (err) {
			throw new InternalServerError(
				'Failed to add avo app to ldap user object',
				err,
				{ ldapObject, url, data }
			);
		}
	}
}
