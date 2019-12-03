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
import { Avo } from '@viaa/avo2-types';
import DataService from '../data/service';
import { INSERT_PROFILE, INSERT_USER } from './queries.gql';
import { InternalServerError } from '../../shared/helpers/error';

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
		const response = await DataService.execute(INSERT_PROFILE, { profile });
		if (!response) {
			throw new InternalServerError(
				'Failed to create avo user profile. Response from insert request was undefined',
				null,
				{ insertProfileResponse: response, query: INSERT_PROFILE });
		}

		const profileId = _.get(response, 'data.insert_shared_users.returning[0].uid');
		if (_.isNil(profileId)) {
			throw new InternalServerError(
				'Failed to create avo user profile. Response from insert request didn\'t contain a uid',
				null,
				{ response, query: INSERT_PROFILE });
		}
		return profileId;
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
