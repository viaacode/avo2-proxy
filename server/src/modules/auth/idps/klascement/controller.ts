import _ from 'lodash';
import { Request } from 'express';

import { Avo } from '@viaa/avo2-types';

import DataService from '../../../data/service';
import { GET_USER_BY_IDP_ID } from '../../queries.gql';
import { IdpHelper } from '../../idp-helper';
import { IdpType } from '../../types';
import { AuthService } from '../../service';
import { CustomError, InternalServerError } from '../../../../shared/helpers/error';

import KlascementService, { KlascementToken, KlascementUserInfo } from './service';

export type LoginSuccessResponse = { avoUser?: Avo.User.User, klascementUserInfo: KlascementUserInfo };

export default class KlascementController extends IdpHelper {

	public static isLoggedIn(request: Request): boolean {
		if (IdpHelper.isSessionExpired(request)) {
			return false;
		}
		const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
		return !!avoUserInfo;
	}

	public static async getUserFromKlascementLogin(code: string): Promise<LoginSuccessResponse> {
		try {

			// Get user info
			const klascementUserInfo: KlascementUserInfo = await this.getKlascementUserInfo(code);

			const userUid: string | null = await this.getUserByIdpId('KLASCEMENT', klascementUserInfo.id);
			let avoUser: Avo.User.User | null;
			if (userUid) {
				avoUser = await AuthService.getAvoUserInfoById(userUid);
				if (!avoUser) {
					throw new InternalServerError('Failed to get user by id from the database after klascement login', null, { userUid });
				}
			}

			return { avoUser, klascementUserInfo };
		} catch (err) {
			throw new CustomError('Failed to get user from klascement login', err, { code });
		}
	}

	private static async getKlascementUserInfo(code: string): Promise<KlascementUserInfo> {
		try {
			// Get api token
			const token: KlascementToken = await KlascementService.getToken(code);
			if (!token || !token.access_token || !token.user_id) {
				throw new InternalServerError('Failed to get api token or user id from klascement api', null, { token });
			}

			// Get user info
			const userInfo: KlascementUserInfo = await KlascementService.getUserInfo(token.access_token, token.user_id);
			if (!userInfo) {
				throw new InternalServerError('Failed to get userinfo from klascement api', null, { userInfo });
			}
			return userInfo;
		} catch (err) {
			throw new CustomError('Failed to get klascement user info', err, { code });
		}
	}

	private static async getUserByIdpId(idpType: IdpType, idpId: string): Promise<string | null> {
		const response = await DataService.execute(GET_USER_BY_IDP_ID, {
			idpType,
			idpId,
		});
		return _.get(response, 'data.shared_users[0].uid', null);
	}
}
