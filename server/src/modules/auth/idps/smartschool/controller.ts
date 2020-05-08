import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import DataService from '../../../data/service';
import AuthController from '../../controller';
import { IdpHelper } from '../../idp-helper';
import { GET_PROFILE_IDS_BY_USER_UID, GET_USER_BY_IDP_ID } from '../../queries.gql';
import { AuthService } from '../../service';
import { IdpType } from '../../types';
import { BasicIdpUserInfo } from '../hetarchief/controller';

import SmartschoolService, { SmartschoolToken, SmartschoolUserInfo } from './service';

export type SmartschoolLoginError = 'FIRST_LINK_ACCOUNT' | 'NO_ACCESS';
export type LoginErrorResponse = { error: SmartschoolLoginError };
export type LoginSuccessResponse = { avoUser?: Avo.User.User, smartschoolUserInfo: SmartschoolUserInfo };
export type SmartschoolUserLoginResponse = LoginErrorResponse | LoginSuccessResponse;

export default class SmartschoolController extends IdpHelper {

	public static isLoggedIn(request: Request): boolean {
		if (IdpHelper.isSessionExpired(request)) {
			return false;
		}
		const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
		return !!avoUserInfo;
	}

	public static async getUserFromSmartschoolLogin(code: string): Promise<SmartschoolUserLoginResponse> {
		try {

			// Get user info
			const smartschoolUserInfo: SmartschoolUserInfo = await this.getSmartschoolUserInfo(code);

			// Pupil
			if (smartschoolUserInfo.leerling) { // if leerling is true (not false or undefined)
				// logged in user is a student
				let userUid: string | null = await this.getUserByIdpId('SMARTSCHOOL', smartschoolUserInfo.userID);

				if (!userUid) {
					// Create avo user through graphql
					userUid = await this.createUser(smartschoolUserInfo);
				}

				let profileId: string | null = _.first(await this.getProfileIdsByUserUid(userUid));

				if (!profileId) {
					// Create avo profile through graphql
					profileId = await this.createProfile(smartschoolUserInfo, userUid);

					// Add permission groups
					await AuthService.addUserGroupsToProfile([4], profileId);
				}

				const avoUser: Avo.User.User = await AuthService.getAvoUserInfoById(userUid);

				return { avoUser, smartschoolUserInfo };
			}

			// Teacher
			if (smartschoolUserInfo.basisrol === 'leerkracht') {
				const userUid: string | null = await this.getUserByIdpId('SMARTSCHOOL', smartschoolUserInfo.userID);
				let avoUser: Avo.User.User | null;
				if (userUid) {
					avoUser = await AuthService.getAvoUserInfoById(userUid);
					if (!avoUser) {
						throw new InternalServerError('Failed to get user by id from the database after smartschool login', null, { userUid });
					}
				}

				return { avoUser, smartschoolUserInfo };
			}

			// Other
			return { error: 'NO_ACCESS' };
		} catch (err) {
			throw new CustomError('Failed to get user from smartschool login', err, { code });
		}
	}

	private static async getSmartschoolUserInfo(code: string): Promise<SmartschoolUserInfo> {
		try {
		// Get api token
		const token: SmartschoolToken = await SmartschoolService.getToken(code);
		if (!token || !token.access_token) {
			throw new InternalServerError('Failed to get api token from smartschool api', null, { token });
		}

		// Get user info
		const userInfo: SmartschoolUserInfo = await SmartschoolService.getUserInfo(token.access_token);
		if (!userInfo) {
			throw new InternalServerError('Failed to get userinfo from smartschool api', null, { userInfo });
		}
		return userInfo;
		} catch (err) {
			throw new CustomError('Failed to get smartschool user info', err, { code });
		}
	}

	private static async createUser(smartschoolUserInfo: SmartschoolUserInfo): Promise<string> {
		try {
			const user: BasicIdpUserInfo = {
				first_name: smartschoolUserInfo.voornaam,
				last_name: smartschoolUserInfo.naam,
				mail: smartschoolUserInfo.email,
				roles: ['leerling'],
			};
			const userUid = await AuthController.createUser(user);

			// Add idp to user object
			await this.createIdpMap('SMARTSCHOOL', smartschoolUserInfo.userID, userUid);

			return userUid;
		} catch (err) {
			throw new InternalServerError('Failed to create user from smartschool login', err, { smartschoolUserInfo });
		}
	}

	private static async createProfile(smartschoolUserInfo: SmartschoolUserInfo, userUid: string): Promise<string> {
		const profile: Partial<Avo.User.Profile> = {
			alternative_email: smartschoolUserInfo.email,
			user_id: userUid,
			alias: userUid,
		};
		return AuthController.createProfile(profile);
	}

	private static async getUserByIdpId(idpType: IdpType, idpId: string): Promise<string | null> {
		const response = await DataService.execute(GET_USER_BY_IDP_ID, {
			idpType,
			idpId,
		});
		return _.get(response, 'data.shared_users[0].uid', null);
	}

	private static async getProfileIdsByUserUid(userUid: string): Promise<string[]> {
		const response = await DataService.execute(GET_PROFILE_IDS_BY_USER_UID, {
			userUid,
		});
		return _.get(response, 'data.users_profiles', []).map((profile: { id: string }) => profile.id);
	}
}
