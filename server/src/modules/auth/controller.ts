import _ from 'lodash';
import { Request } from 'express';
import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

import HetArchiefController from './idps/hetarchief/controller';
import SmartschoolController from './idps/smartschool/controller';
import { LoginResponse, IdpType } from './types';
import KlascementController from './idps/klascement/controller';
import ViaaController from './idps/viaa/controller';
import { logger } from '../../shared/helpers/logger';
import { IdpHelper } from './idp-adapter';

const IDP_ADAPTERS: { [idpType in IdpType]: { controller: { isLoggedIn: (req: Request) => boolean }, logoutPath: string } } = {
	HETARCHIEF: { controller: HetArchiefController, logoutPath: 'auth/hetarchief/logout' },
	SMARTSCHOOL: { controller: SmartschoolController, logoutPath: 'auth/smartschool/logout' },
	KLASCEMENT: { controller: KlascementController, logoutPath: 'auth/klascement/logout' },
	VIAA: { controller: ViaaController, logoutPath: 'auth/viaa/logout' },
};

export default class AuthController {
	public static isAuthenticated(req: Request) {
		return _.some(IDP_ADAPTERS, adapter => adapter.controller.isLoggedIn(req));
	}

	public static async getLoginResponse(req: Request): Promise<LoginResponse> {
		if (AuthController.isAuthenticated(req)) {
			logger.info('check login: user is authenticated');
			const userInfo = await IdpHelper.getAvoUserInfoFromSession(req);

			return {
				userInfo,
				message: 'LOGGED_IN',
			};
		}
		logger.info('check login: user is not authenticated');
		return { message: 'LOGGED_OUT' };
	}

	public static getIdpSpecificLogoutPage(req: Request, returnToUrl: string) {
		const idpType = IdpHelper.getIdpTypeFromSession(req);
		if (!idpType) {
			// already logged out
			new Return.MovedTemporarily(returnToUrl);
		}
		// Redirect to dp specific logout page
		return new Return.MovedTemporarily(`${process.env.HOST}/${IDP_ADAPTERS[idpType].logoutPath}?${queryString.stringify({
			returnToUrl,
		})}`);
	}
}
