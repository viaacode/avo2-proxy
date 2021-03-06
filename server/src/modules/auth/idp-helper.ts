import { Request } from 'express';
import { get, set } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError, InternalServerError, ServerError } from '../../shared/helpers/error';
import DataService from '../data/data.service';

import HetArchiefService from './idps/het-archief/het-archief.service';
import { GET_IDP_MAP, INSERT_IDP_MAP } from './queries.gql';
import { AuthService } from './service';
import { IdpMap } from './types';

const IDP_USER_INFO_PATH = 'session.idpUserInfo';
const AVO_USER_INFO_PATH = 'session.avoUserInfo';
const IDP_TYPE_PATH = 'session.idpType';

export class IdpHelper {
	public static getIdpUserInfoFromSession(request: Request): any | null {
		const idpType = IdpHelper.getIdpTypeFromSession(request);
		return get(request, `${IDP_USER_INFO_PATH}.${idpType}`, null);
	}

	public static setIdpUserInfoOnSession(
		request: Express.Request,
		idpUserInfo: any | null,
		idpType: Avo.Auth.IdpType | null
	): void {
		if (request.session) {
			set(request, `${IDP_USER_INFO_PATH}.${idpType}`, idpUserInfo);
			set(request, IDP_TYPE_PATH, idpUserInfo ? idpType : null); // clear the idpType if idpUserInfo is null
		} else {
			throw new InternalServerError(
				'Failed to store idp user info / ipd type because no session was found on the request object',
				null,
				{ idpUserInfo }
			);
		}
	}

	public static clearAllIdpUserInfosFromSession(request: Express.Request) {
		const idpTypes: Avo.Auth.IdpType[] = ['HETARCHIEF', 'SMARTSCHOOL', 'KLASCEMENT'];
		idpTypes.forEach((idpType: Avo.Auth.IdpType) => {
			IdpHelper.setIdpUserInfoOnSession(request, null, idpType);
		});
	}

	public static getAvoUserInfoFromSession(request: Request): Avo.User.User | null {
		// Check if the avo session is expired
		if (IdpHelper.isSessionExpired(request)) {
			return null;
		}
		return get(request, AVO_USER_INFO_PATH, null);
	}

	public static async getUpdatedAvoUserInfoFromSession(request: Request): Promise<Avo.User.User> {
		const avoUser: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(request);
		if (!avoUser) {
			throw new ServerError('User object was not found on the session', null);
		}
		// Refresh avo user info from database
		const avoDbUser: Avo.User.User = await AuthService.getAvoUserInfoById(avoUser.uid);
		if (!avoDbUser) {
			throw new ServerError('Failed to find avo user in the database', null, {
				userUid: avoUser.uid,
			});
		}

		return avoDbUser;
	}

	public static setAvoUserInfoOnSession(
		request: Express.Request,
		user: Avo.User.User | null
	): void {
		try {
			if (request.session) {
				set(request, AVO_USER_INFO_PATH, user);
			} else {
				throw new InternalServerError(
					'Failed to store avo user info because no session was found on the request object',
					null,
					{ user }
				);
			}
		} catch (err) {
			throw new InternalServerError('Failed to store avo user info', err);
		}
	}

	public static getIdpTypeFromSession(request: Request): Avo.Auth.IdpType | null {
		// Check if the avo session is expired
		if (IdpHelper.isSessionExpired(request)) {
			return null;
		}
		return get(request, IDP_TYPE_PATH, null);
	}

	public static isSessionExpired(request: Request): boolean {
		const expires = get(request, 'session.cookie.expires', null);
		return !expires || !expires.valueOf || expires.valueOf() < Date.now();
	}

	public static logout(req: Request) {
		IdpHelper.clearAllIdpUserInfosFromSession(req);
		IdpHelper.setAvoUserInfoOnSession(req, null);
	}

	public static async createIdpMap(
		idpType: Avo.Auth.IdpType,
		idpUserId: string,
		localUserId: string
	) {
		try {
			const idpMap: Partial<IdpMap> = {
				idp: idpType,
				idp_user_id: idpUserId,
				local_user_id: localUserId,
			};
			const getResponse = await DataService.execute(GET_IDP_MAP, {
				idpType,
				idpUserId,
				localUserId,
			});
			if (!getResponse) {
				throw new InternalServerError('Failed to get idp map entry from database', null, {
					getResponse,
				});
			}

			const entry = get(getResponse, 'data.users_idp_map[0]');
			if (entry) {
				return; // The required entry already exists
			}

			const insertResponse = await DataService.execute(INSERT_IDP_MAP, { idpMap });
			if (!insertResponse) {
				throw new InternalServerError(
					'Failed to link avo user to an idp. Response from insert request was undefined',
					null,
					{ insertResponse }
				);
			}

			if (idpType === 'HETARCHIEF') {
				// set avo id in ldap, so we can link from ACM => AVO2 admin dashboard
				await HetArchiefService.setLdapUserInfo(idpUserId, { external_id: localUserId });
			}
		} catch (err) {
			throw new CustomError('Failed to link user to idp', err, {
				idpType,
				idpUserId,
				localUserId,
				query: [GET_IDP_MAP, INSERT_IDP_MAP],
			});
		}
	}
}
