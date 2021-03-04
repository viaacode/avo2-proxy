import { Request } from 'express';
import { extend, get, isNil } from 'lodash';
import moment from 'moment';
import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../shared/helpers/error-redirect-client';
import { logger } from '../../shared/helpers/logger';
import { isLoggedIn } from '../../shared/middleware/is-authenticated';
import i18n from '../../shared/translations/i18n';
import DataService from '../data/data.service';
import EventLoggingController from '../event-logging/controller';

import { ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS, IDP_ADAPTERS } from './consts';
import { IdpHelper } from './idp-helper';
import { BasicIdpUserInfo } from './idps/het-archief/het-archief.controller';
import {
	DELETE_IDP_MAPS,
	GET_NOTIFICATION,
	GET_USER_ROLE_BY_NAME,
	INSERT_PROFILE,
	INSERT_USER,
} from './queries.gql';
import { LinkAccountInfo } from './route';
import { AuthService } from './service';

export default class AuthController {
	public static async getLoginResponse(req: Request): Promise<Avo.Auth.LoginResponse> {
		if (isLoggedIn(req)) {
			const userInfo = await IdpHelper.getUpdatedAvoUserInfoFromSession(req);
			const acceptedConditions = await AuthController.getUserHasAcceptedUsageAndPrivacyDeclaration(
				userInfo
			);
			AuthService.updateUserLastAccessDate(userInfo.uid).catch((err) => {
				logger.error(
					new CustomError('Failed to update user last access date', err, {
						userId: userInfo.uid,
					})
				);
			});
			const now = moment();

			EventLoggingController.insertEvent(
				{
					object: userInfo.uid,
					object_type: 'user',
					message: `${get(userInfo, 'first_name')} ${get(
						userInfo,
						'last_name'
					)} is geauthenticeerd door de proxy server`,
					action: 'authenticate',
					subject: userInfo.uid,
					subject_type: 'system',
					occurred_at: new Date().toISOString(),
					source_url: process.env.HOST + req.path,
				},
				req
			);

			return {
				userInfo,
				acceptedConditions,
				message: 'LOGGED_IN',
				sessionExpiresAt: now
					.add(now.hours() < 5 ? 0 : 1, 'days')
					.hours(5)
					.minutes(0)
					.seconds(0)
					.milliseconds(0)
					.toISOString(),
			};
		}

		return { message: 'LOGGED_OUT' };
	}

	public static async getUserHasAcceptedUsageAndPrivacyDeclaration(
		userInfo: Avo.User.User
	): Promise<boolean> {
		const profileId = get(userInfo, 'profile.id');
		if (!profileId) {
			return false;
		}
		const response = await DataService.execute(GET_NOTIFICATION, {
			profileId,
			key: ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS,
		});
		if (response.errors) {
			logger.error(
				new CustomError('Failed to get notification from database', null, {
					response,
					query: GET_NOTIFICATION,
					variables: {
						profileId,
						key: ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS,
					},
				})
			);
			return false;
		}
		return get(response, 'data.users_notifications[0].through_platform', false);
	}

	public static async getRoleId(roleName: string): Promise<number> {
		try {
			const response = await DataService.execute(GET_USER_ROLE_BY_NAME, {
				roleName,
			});
			const roleId: number | undefined = get(response, 'data.shared_user_roles[0].id');
			if (isNil(roleId)) {
				throw new CustomError('Role with specified name was not found');
			}
			return roleId;
		} catch (err) {
			throw new CustomError('Failed to get role id by role name from the database', err, {
				roleName,
				query: 'GET_USER_ROLE_BY_NAME',
			});
		}
	}

	public static async createUser(ldapUser: BasicIdpUserInfo): Promise<string> {
		try {
			const { roles, ...user } = ldapUser;
			const avoUser: Partial<Avo.User.User> = user;
			avoUser.role_id = await AuthController.getRoleId(ldapUser.roles[0]);
			const response = await DataService.execute(INSERT_USER, { user });
			if (!response) {
				throw new InternalServerError('Response from insert request was undefined', null, {
					insertUserResponse: response,
				});
			}

			const userUid = get(response, 'data.insert_shared_users.returning[0].uid');
			if (isNil(userUid)) {
				throw new InternalServerError(
					"Response from insert request didn't contain a uid",
					null,
					{ response }
				);
			}
			return userUid;
		} catch (err) {
			throw new InternalServerError('Failed to create avo user', err, {
				insertUserResponse: ldapUser,
				query: INSERT_USER,
			});
		}
	}

	public static async createProfile(profile: Partial<Avo.User.Profile>): Promise<string> {
		const profileWithDefaults = extend(
			{
				alias: null,
				title: null,
				avatar: null,
			},
			profile
		);
		const response = await DataService.execute(INSERT_PROFILE, {
			profile: profileWithDefaults,
		});
		if (!response) {
			throw new InternalServerError(
				'Failed to create avo user profile. Response from insert request was undefined',
				null,
				{ insertProfileResponse: response, query: INSERT_PROFILE }
			);
		}

		const profileId = get(response, 'data.insert_users_profiles.returning[0].id');
		if (isNil(profileId)) {
			throw new InternalServerError(
				"Failed to create avo user profile. Response from insert request didn't contain a uid",
				null,
				{ response, query: INSERT_PROFILE }
			);
		}
		return profileId;
	}

	public static getIdpSpecificLogoutPage(
		req: Request,
		returnToUrl: string
	): Return.MovedTemporarily<void> {
		const idpType = IdpHelper.getIdpTypeFromSession(req);
		if (!idpType) {
			// already logged out
			return new Return.MovedTemporarily(returnToUrl);
		}
		// Redirect to dp specific logout page
		return new Return.MovedTemporarily(
			`${process.env.HOST}/${IDP_ADAPTERS[idpType].logoutPath}?${queryString.stringify({
				returnToUrl,
			})}`
		);
	}

	public static async redirectToIdpLoginForLinkingAccounts(
		request: Request,
		returnToUrl: string,
		idpType: Avo.Auth.IdpType
	) {
		const avoUserInfo: Avo.User.User = await IdpHelper.getUpdatedAvoUserInfoFromSession(
			request
		);

		// Check if this idp type is already linked to the currently logged in account
		if ((avoUserInfo.idpmaps || []).includes(idpType)) {
			const idpTypeLowerCase = idpType.toLowerCase();
			return redirectToClientErrorPage(
				// TODO rename this key so it doesn't include "smartschool"
				i18n.t(
					'modules/auth/controller___je-account-is-reeds-gelinked-met-idp-type-unlink-je-account-eerst-van-je-andere-smartschool-account',
					{ idpType: idpTypeLowerCase }
				),
				'link',
				['home', 'helpdesk']
			);
		}

		// Redirect the user to the idp login, to authenticate the idp account, so users can't link accounts that aren't theirs
		const idpLoginPath: string | undefined = IDP_ADAPTERS[idpType].loginPath;
		if (!idpLoginPath) {
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/controller___dit-platform-kan-nog-niet-gelinked-worden-aan-uw-account'
				),
				'link',
				['home', 'helpdesk']
			);
		}

		// Let the user login to smartschool, then redirect to this url
		const serverRedirectUrl = `${
			process.env.HOST
		}/auth/link-account-callback?${queryString.stringify({
			returnToUrl,
		})}`;
		return new Return.MovedTemporarily(
			`${process.env.HOST}/${idpLoginPath}?${queryString.stringify({
				returnToUrl: serverRedirectUrl,
			})}`
		);
	}

	public static async linkAccounts(
		request: Request,
		idpUserInfo: LinkAccountInfo,
		returnToUrl: string
	) {
		let avoUserInfo: Avo.User.User | undefined;
		try {
			avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);

			// Link idp accounts to each other
			await IdpHelper.createIdpMap(
				idpUserInfo.type,
				String(IDP_ADAPTERS[idpUserInfo.type].getUserId(idpUserInfo.userObject)),
				avoUserInfo.uid
			);
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new ExternalServerError(
				'Failed to insert the idp map to link an account',
				err,
				{
					avoUserInfo,
					idpUserInfo,
					returnToUrl,
				}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/controller___het-linken-van-de-account-is-mislukt-database-error'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	public static async unlinkAccounts(request: Request, idpType: Avo.Auth.IdpType) {
		let avoUserInfo: Avo.User.User;
		try {
			avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
			await DataService.execute(DELETE_IDP_MAPS, {
				idpType,
				avoUserId: avoUserInfo.uid,
			});
		} catch (err) {
			const error = new ExternalServerError('Failed to remove idp map from database', err, {
				idpType,
				avoUserInfo,
			});
			logger.error(error);
			const idpTypeLowercase = idpType.toLowerCase();
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/controller___er-ging-iets-mis-bij-het-unlinken-van-de-idp-type-account',
					{ idpType: idpTypeLowercase }
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}
}
