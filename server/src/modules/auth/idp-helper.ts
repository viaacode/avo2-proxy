import { IdpType } from './types';
import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';
import { Request } from 'express';
import { InternalServerError, ServerError } from '../../shared/helpers/error';
import { AuthService } from './service';

const IDP_USER_INFO_PATH = 'session.idpUserInfo';
const AVO_USER_INFO_PATH = 'session.avoUserInfo';
const IDP_TYPE_PATH = 'session.idpType';

export class IdpHelper {

	public static getIdpUserInfoFromSession(request: Request): any | null {
		const idpType = IdpHelper.getIdpTypeFromSession(request);
		return _.get(request, `${IDP_USER_INFO_PATH}.${idpType}`, null);
	}

	public static setIdpUserInfoOnSession(request: Express.Request, idpUserInfo: any, idpType: IdpType | null): void {
		if (request.session) {
			_.set(request, `${IDP_USER_INFO_PATH}.${idpType}`, idpUserInfo);
			_.set(request, IDP_TYPE_PATH, idpType);
		} else {
			throw new InternalServerError(
				'Failed to store idp user info / ipd type because no session was found on the request object',
				null,
				{ idpUserInfo },
			);
		}
	}

	public static clearAllIdpUserInfosFromSession(request: Express.Request) {
		const idpTypes: IdpType[] = ['HETARCHIEF', 'VIAA', 'SMARTSCHOOL', 'KLASCEMENT'];
		idpTypes.forEach((idpType: IdpType) => this.setIdpUserInfoOnSession(request, null, idpType));
	}

	public static getAvoUserInfoFromSession(request: Request): Avo.User.User | null {
		// Check if the avo session is expired
		if (this.isSessionExpired(request)) {
			return null;
		}
		return _.get(request, AVO_USER_INFO_PATH, null);
	}

	public static async getUpdatedAvoUserInfoFromSession(request: Request): Promise<Avo.User.User> {
		const avoUser: Avo.User.User | null = this.getAvoUserInfoFromSession(request);
		if (!avoUser) {
			throw new ServerError('User object was not found on the session', null);
		}
		// Refresh avo user info from database
		const avoDbUser: Avo.User.User = await AuthService.getAvoUserInfoById(avoUser.uid);
		if (!avoDbUser) {
			throw new ServerError('Failed to find avo user in the database', null, { userUid: avoUser.uid });
		}

		return avoDbUser;
	}

	public static setAvoUserInfoOnSession(request: Express.Request, user: Avo.User.User | null): void {
		try {
			if (request.session) {
				_.set(request, AVO_USER_INFO_PATH, user);
			} else {
				throw new InternalServerError(
					'Failed to store avo user info because no session was found on the request object',
					null,
					{ user },
				);
			}
		} catch (err) {
			throw new InternalServerError('Failed to store avo user info', err);
		}
	}

	public static getIdpTypeFromSession(request: Request): IdpType | null {
		// Check if the avo session is expired
		if (IdpHelper.isSessionExpired(request)) {
			return null;
		}
		return _.get(request, IDP_TYPE_PATH, null);
	}

	public static isSessionExpired(request: Request): boolean {
		const expires = _.get(request, 'session.cookie.expires', null);
		return !expires || !expires.valueOf || expires.valueOf() < Date.now();
	}

	public static logout(req: Request) {
		IdpHelper.setIdpUserInfoOnSession(req, null, null);
		IdpHelper.setAvoUserInfoOnSession(req, null);
	}
}