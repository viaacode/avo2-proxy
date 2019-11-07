import { IdpType, SharedUser } from './types';
import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';
import { Request } from 'express';
import { CustomError } from '../../shared/helpers/error';

const IDP_USER_INFO_PATH = 'session.idpUserInfo';
const AVO_USER_INFO_PATH = 'session.avoUserInfo';
const IDP_TYPE_PATH = 'session.idpType';

export class IdpHelper {

	public static getIdpUserInfoFromSession(request: Request): any | null {
		// Check if the avo session is expired
		if (this.isSessionExpired(request)) {
			return null;
		}
		return _.get(request, IDP_USER_INFO_PATH, null);
	}

	public static setIdpUserInfoOnSession(request: Express.Request, idpUserInfo: any, idpType: IdpType | null): void {
		if (request.session) {
			_.set(request, IDP_USER_INFO_PATH, idpUserInfo);
			_.set(request, IDP_TYPE_PATH, idpType);
		} else {
			throw new CustomError(
				'Failed to store idp user info / ipd type because no session was found on the request object',
				null,
				{ idpUserInfo },
			);
		}
	}

	public static getAvoUserInfoFromSession(request: Request): Avo.User.User | null {
		// Check if the avo session is expired
		if (this.isSessionExpired(request)) {
			return null;
		}
		return _.get(request, AVO_USER_INFO_PATH, null);
	}

	public static setAvoUserInfoOnSession(request: Express.Request, user: SharedUser | null): void {
		try {
			if (user) {
				// Simplify user object structure
				(user as any).profile = user.profiles[0];
				const permissions = new Set<string>();
				_.get(user, 'profiles[0].groups', []).forEach((group: any) => {
					_.get(group, 'group.group_user_permission_groups', []).forEach((permissionGroup: any) => {
						_.get(permissionGroup, 'permission_group.permission_group_user_permissions', []).forEach((permission: any) => {
							permissions.add(permission.permission.label);
						});
					});
				});
				(user as any).permissions = Array.from(permissions);
				delete user.profiles;
			}

			if (request.session) {
				_.set(request, AVO_USER_INFO_PATH, user);
			} else {
				throw new CustomError(
					'Failed to store avo user info because no session was found on the request object',
					null,
					{ user },
				);
			}
		} catch (err) {
			throw new CustomError('Failed to store avo user info', err);
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
