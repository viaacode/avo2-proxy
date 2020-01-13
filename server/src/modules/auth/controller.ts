import _ from 'lodash';
import { Request } from 'express';
import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

import HetArchiefController from './idps/hetarchief/controller';
import SmartschoolController from './idps/smartschool/controller';
import { IdpType, IdpMap } from './types';
import KlascementController from './idps/klascement/controller';
import ViaaController from './idps/viaa/controller';
import { logger } from '../../shared/helpers/logger';
import { IdpHelper } from './idp-helper';
import { Avo } from '@viaa/avo2-types';
import DataService from '../data/service';
import { DELETE_IDP_MAPS, INSERT_IDP_MAP, INSERT_PROFILE, INSERT_USER } from './queries.gql';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { getHost } from '../../shared/helpers/url';
import { LinkAccountInfo } from './route';
import { SmartschoolUserInfo } from './idps/smartschool/service';
import { AuthService } from './service';

interface IdpInterface {
	controller: { isLoggedIn: (req: Request) => boolean };
	logoutPath: string;
	loginPath?: string;
	getUserId?: (userInfo: any) => string | number;
}

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

			return {
				userInfo,
				message: 'LOGGED_IN',
			};
		}
		logger.info('check login: user is not authenticated');
		return { message: 'LOGGED_OUT' };
	}

	public static async createUser(user: Partial<Avo.User.User>): Promise<string> {
		const response = await DataService.execute(INSERT_USER, { user });
		if (!response) {
			throw new InternalServerError(
				'Failed to create avo user. Response from insert request was undefined',
				null,
				{ insertUserResponse: response, query: INSERT_USER });
		}

		const userUid = _.get(response, 'data.insert_shared_users.returning[0].uid');
		if (_.isNil(userUid)) {
			throw new InternalServerError(
				'Failed to create avo user. Response from insert request didn\'t contain a uid',
				null,
				{ response, query: INSERT_USER });
		}
		return userUid;
	}

	public static async createProfile(profile: Partial<Avo.User.Profile>): Promise<string> {
		const profileWithLocation = _.extend({
			location: 'nvt',
			alias: null,
			avatar: null,
		}, profile);
		const response = await DataService.execute(INSERT_PROFILE, { profile: profileWithLocation });
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
		const clientHost = getHost(returnToUrl);

		const avoUserInfo: Avo.User.User = await IdpHelper.getUpdatedAvoUserInfoFromSession(request);

		// Check if this idp type is already linked to the currently logged in account
		if (((avoUserInfo as any).idpmaps || []).map((obj: { idp: string }) => obj.idp).includes(idpType)) { // TODO remove "any" cast once typings are updated
			return new Return.MovedTemporarily<void>(`${clientHost}/error?${queryString.stringify({
				message: `Je account is reeds gelinked met ${idpType.toLowerCase()}. Unlink je account eerst van je andere smartschool account`,
				icon: 'link',
			})}`);
		}

		// Redirect the user to the idp login, to authenticate the idp account, so users can't link accounts that aren't theirs
		const idpLoginPath: string | undefined = IDP_ADAPTERS[idpType].loginPath;
		if (!idpLoginPath) {
			return new Return.MovedTemporarily<void>(`${clientHost}/error?${queryString.stringify({
				message: 'Dit platform kan nog niet gelinked worden aan uw account',
				icon: 'link',
			})}`);
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
		// TODO Can the user unlink?
		const clientHost = getHost(returnToUrl);
		let avoUserInfo: Avo.User.User | undefined;
		try {
			avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
			const idpMap: Partial<IdpMap> = {
				idp: idpUserInfo.type,
				idp_user_id: String(IDP_ADAPTERS[idpUserInfo.type].getUserId(idpUserInfo.userObject)),
				local_user_id: avoUserInfo.uid,
			};

			// Link idp accounts to each other
			await DataService.execute(INSERT_IDP_MAP, { idpMap });
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			logger.error(new ExternalServerError('Failed to insert the idp map to link an account', err, { avoUserInfo, idpUserInfo, returnToUrl }));
			return new Return.MovedTemporarily<void>(`${clientHost}/error?${queryString.stringify({
				message: 'Het linken van de account is mislukt (database error)',
				icon: 'alert-triangle',
			})}`);
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
			throw new InternalServerError('Failed to remove idp map from database', err, { idpType, avoUserInfo });
		}
	}
}
