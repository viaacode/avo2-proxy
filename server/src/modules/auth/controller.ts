import { Request } from 'express';
import _ from 'lodash';
import moment from 'moment';
import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../shared/helpers/error-redirect-client';
import { logger } from '../../shared/helpers/logger';
import i18n from '../../shared/translations/i18n';
import DataService from '../data/service';

import { IdpHelper } from './idp-helper';
import HetArchiefController, { BasicIdpUserInfo } from './idps/hetarchief/controller';
import KlascementController from './idps/klascement/controller';
import { KlascementUserInfo } from './idps/klascement/service';
import SmartschoolController from './idps/smartschool/controller';
import { SmartschoolUserInfo } from './idps/smartschool/service';
import ViaaController from './idps/viaa/controller';
import { DELETE_IDP_MAPS, GET_NOTIFICATION, GET_USER_ROLE_BY_NAME, INSERT_PROFILE, INSERT_USER } from './queries.gql';
import { LinkAccountInfo } from './route';
import { IdpType } from './types';

interface IdpInterface {
	controller: { isLoggedIn: (req: Request) => boolean };
	logoutPath: string;
	loginPath?: string;
	getUserId?: (userInfo: any) => string | number;
}

export const ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS =
	'ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS';

const IDP_ADAPTERS: { [idpType in IdpType]: IdpInterface } = {
	HETARCHIEF: {
		controller: HetArchiefController,
		logoutPath: 'auth/hetarchief/logout',
	},
	SMARTSCHOOL: {
		controller: SmartschoolController,
		logoutPath: 'auth/smartschool/logout',
		loginPath: 'auth/smartschool/login', // Used for linking accounts
		getUserId: (idpUserInfo: SmartschoolUserInfo): string => idpUserInfo.userID,
	},
	KLASCEMENT: {
		controller: KlascementController,
		logoutPath: 'auth/klascement/logout',
		loginPath: 'auth/klascement/login', // Used for linking accounts
		getUserId: (idpUserInfo: KlascementUserInfo): string => idpUserInfo.id,
	},
	VIAA: {
		controller: ViaaController,
		logoutPath: 'auth/viaa/logout',
	},
};

export default class AuthController {
	public static isAuthenticated(req: Request) {
		return _.some(IDP_ADAPTERS, adapter => adapter.controller.isLoggedIn(req));
	}

	public static async getLoginResponse(req: Request): Promise<Avo.Auth.LoginResponse> {
		if (AuthController.isAuthenticated(req)) {
			logger.info('check login: user is authenticated');
			const userInfo = await IdpHelper.getUpdatedAvoUserInfoFromSession(req);
			const acceptedConditions = await AuthController.getUserHasAcceptedUsageAndPrivacyDeclaration(userInfo);
			const now = moment();

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
		logger.info('check login: user is not authenticated');
		return { message: 'LOGGED_OUT' };
	}

	public static async getUserHasAcceptedUsageAndPrivacyDeclaration(userInfo: Avo.User.User): Promise<boolean> {
		const profileId = _.get(userInfo, 'profile.id');
		if (!profileId) {
			return false;
		}
		const response = await DataService.execute(GET_NOTIFICATION, {
			profileId,
			key: ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS,
		});
		if (response.errors) {
			logger.error(new CustomError(
				'Failed to get notification from database',
				null,
				{
					response,
					query: GET_NOTIFICATION,
					variables: {
						profileId,
						key: ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS,
					},
				}));
			return false;
		}
		return _.get(response, 'data.users_notifications[0].through_platform', false);
	}

	private static async getRoleId(roleName: string): Promise<number> {
		try {
			const response = await DataService.execute(GET_USER_ROLE_BY_NAME, { roleName });
			const roleId: number | undefined = _.get(response, 'data.shared_user_roles[0].id');
			if (_.isNil(roleId)) {
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
			avoUser.role_id = await this.getRoleId(ldapUser.roles[0]);
			const response = await DataService.execute(INSERT_USER, { user });
			if (!response) {
				throw new InternalServerError(
					'Response from insert request was undefined',
					null,
					{ insertUserResponse: response });
			}

			const userUid = _.get(response, 'data.insert_shared_users.returning[0].uid');
			if (_.isNil(userUid)) {
				throw new InternalServerError(
					'Response from insert request didn\'t contain a uid',
					null,
					{ response });
			}
			return userUid;
		} catch (err) {
			throw new InternalServerError(
				'Failed to create avo user',
				null,
				{ insertUserResponse: ldapUser, query: INSERT_USER });
		}
	}

	public static async createProfile(profile: Partial<Avo.User.Profile>): Promise<string> {
		const profileWithDefaults = _.extend({
			alias: null,
			avatar: null,
		}, profile);
		const response = await DataService.execute(INSERT_PROFILE, { profile: profileWithDefaults });
		if (!response) {
			throw new InternalServerError(
				'Failed to create avo user profile. Response from insert request was undefined',
				null,
				{ insertProfileResponse: response, query: INSERT_PROFILE });
		}

		const profileId = _.get(response, 'data.insert_users_profiles.returning[0].id');
		if (_.isNil(profileId)) {
			throw new InternalServerError(
				'Failed to create avo user profile. Response from insert request didn\'t contain a uid',
				null,
				{ response, query: INSERT_PROFILE });
		}
		return profileId;
	}

	public static getIdpSpecificLogoutPage(req: Request, returnToUrl: string): Return.MovedTemporarily<void> {
		const idpType = IdpHelper.getIdpTypeFromSession(req);
		if (!idpType) {
			// already logged out
			return new Return.MovedTemporarily(returnToUrl);
		}
		// Redirect to dp specific logout page
		return new Return.MovedTemporarily(`${process.env.HOST}/${IDP_ADAPTERS[idpType].logoutPath}?${queryString.stringify({
			returnToUrl,
		})}`);
	}

	public static async redirectToIdpLoginForLinkingAccounts(request: Request, returnToUrl: string, idpType: IdpType) {
		const avoUserInfo: Avo.User.User = await IdpHelper.getUpdatedAvoUserInfoFromSession(request);

		// Check if this idp type is already linked to the currently logged in account
		if ((avoUserInfo.idpmaps || []).includes(idpType)) {
			const idpTypeLowerCase = idpType.toLowerCase();
			return redirectToClientErrorPage(
				// TODO rename this key so it doesn't include "smartschool"
				i18n.t('modules/auth/controller___je-account-is-reeds-gelinked-met-idp-type-unlink-je-account-eerst-van-je-andere-smartschool-account',
					{ idpType: idpTypeLowerCase }
				),
				'link',
				['home', 'helpdesk'],
			);
		}

		// Redirect the user to the idp login, to authenticate the idp account, so users can't link accounts that aren't theirs
		const idpLoginPath: string | undefined = IDP_ADAPTERS[idpType].loginPath;
		if (!idpLoginPath) {
			return redirectToClientErrorPage(
				i18n.t('modules/auth/controller___dit-platform-kan-nog-niet-gelinked-worden-aan-uw-account'),
				'link',
				['home', 'helpdesk'],
			);
		}

		// Let the user login to smartschool, then redirect to this url
		const serverRedirectUrl = `${process.env.HOST}/auth/link-account-callback?${queryString.stringify({
			returnToUrl,
		})}`;
		return new Return.MovedTemporarily(`${process.env.HOST}/${idpLoginPath}?${queryString.stringify({
			returnToUrl: serverRedirectUrl,
		})}`);
	}

	public static async linkAccounts(request: Request, idpUserInfo: LinkAccountInfo, returnToUrl: string) {
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
			const error = new ExternalServerError('Failed to insert the idp map to link an account', err, {
				avoUserInfo,
				idpUserInfo,
				returnToUrl,
			});
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/controller___het-linken-van-de-account-is-mislukt-database-error'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	public static async unlinkAccounts(request: Request, idpType: IdpType) {
		let avoUserInfo: Avo.User.User;
		try {
			avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
			await DataService.execute(DELETE_IDP_MAPS, {
				idpType,
				avoUserId: avoUserInfo.uid,
			});
		} catch (err) {
			const error = new ExternalServerError('Failed to remove idp map from database', err, { idpType, avoUserInfo });
			logger.error(error);
			const idpTypeLowercase = idpType.toLowerCase();
			return redirectToClientErrorPage(
				i18n.t('modules/auth/controller___er-ging-iets-mis-bij-het-unlinken-van-de-idp-type-account', { idpType: idpTypeLowercase }),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}
}
