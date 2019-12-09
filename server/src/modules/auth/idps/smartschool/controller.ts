import SmartschoolService, { SmartschoolToken, SmartschoolUserInfo } from './service';
import DataService from '../../../data/service';
import { GET_PROFILE_IDS_BY_USER_UID, GET_USER_BY_IDP_ID, INSERT_IDP_MAP, INSERT_PROFILE, INSERT_USER } from '../../queries.gql';
import { Avo } from '@viaa/avo2-types';
import _ from 'lodash';
import { IdpMap, IdpType, SharedUser } from '../../types';
import { IdpHelper } from '../../idp-helper';
import { Request } from 'express';
import { AuthService } from '../../service';
import AuthController from '../../controller';
import { InternalServerError } from '../../../../shared/helpers/error';

export type SmartschoolLoginError = 'FIRST_LINK_ACCOUNT' | 'NO_ACCESS';
export type LoginErrorResponse = { error: SmartschoolLoginError };
export type LoginSuccessResponse = { avoUser?: SharedUser, smartschoolUserInfo: SmartschoolUserInfo };
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
				// TODO Create permissions, permissionGroups and userGroups
				// TODO Add this user to the correct userGroups based on smartschoolUserInfo.leerling and smartschoolUserInfo.basisrol
			}

			const avoUser = await AuthService.getAvoUserInfoById(userUid);

			return { avoUser, smartschoolUserInfo };
		}

		// Teacher
		if (smartschoolUserInfo.basisrol === 'leerkracht') {
			const userUid: string | null = await this.getUserByIdpId('SMARTSCHOOL', smartschoolUserInfo.userID);
			let avoUser: SharedUser | undefined;
			if (userUid) {
				avoUser = await AuthService.getAvoUserInfoById(userUid);
				if (!avoUser) {
					throw new InternalServerError('Failed to get user by id from the database after smartschool login', null, { userUid });
				}
			}

			return { avoUser, smartschoolUserInfo };
			// }
			// return { error: 'FIRST_LINK_ACCOUNT' };
		}

		// Other
		return { error: 'NO_ACCESS' };
	}

	private static async getSmartschoolUserInfo(code: string): Promise<SmartschoolUserInfo> {
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
	}

	private static async createUser(smartschoolUserInfo: SmartschoolUserInfo): Promise<string> {
		try {
			const user: Partial<Avo.User.User> = {
				first_name: smartschoolUserInfo.voornaam,
				last_name: smartschoolUserInfo.naam,
				mail: smartschoolUserInfo.email,
				organisation_id: smartschoolUserInfo.instellingsnummer ? String(smartschoolUserInfo.instellingsnummer) : null,
				role_id: 4, // TODO switch this to a lookup in the database for role with name 'student'
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
			location: 'nvt',
			alias: userUid,
		};
		return AuthController.createProfile(profile);
	}

	private static async createIdpMap(idp: IdpType, idpUserId: string, localUserId: string) {
		const idpMap: Partial<IdpMap> = {
			idp,
			idp_user_id: idpUserId,
			local_user_id: localUserId,
		};
		const response = await DataService.execute(INSERT_IDP_MAP, { idpMap });
		if (!response || response.errors && response.errors.length) {
			throw new InternalServerError(
				'Failed to link avo user to an idp. Response from insert request was undefined',
				null,
				{ response, query: INSERT_PROFILE });
		}
	}

	private static async getUserByIdpId(idpType: IdpType, idpId: string): Promise<string | null> {
		const response = await DataService.execute(GET_USER_BY_IDP_ID, {
			idpType,
			idpId,
		});
		return _.get(response, 'data.users_idp_map[0].local_user_id', null);
	}

	private static async getProfileIdsByUserUid(userUid: string): Promise<string[]> {
		const response = await DataService.execute(GET_PROFILE_IDS_BY_USER_UID, {
			userUid,
		});
		return _.get(response, 'data.users_profiles', []).map((profile: { id: string }) => profile.id);
	}
}
