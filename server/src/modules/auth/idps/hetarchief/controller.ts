import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';
import { IdpHelper } from '../../idp-adapter';
import { Request } from 'express';
import { IdpType, LdapUser, SharedUser } from '../../types';
import { AuthService } from '../../service';

export default class HetArchiefController {
	public static isLoggedIn(request: Request): boolean {
		const idpType: IdpType | null = IdpHelper.getIdpTypeFromSession(request);
		if (!idpType) {
			return false;
		}
		if (idpType !== 'HETARCHIEF') {
			return false;
		}
		const idpUserInfo: LdapUser | null = IdpHelper.getIdpUserInfoFromSession(request);
		if (!idpUserInfo) {
			return false;
		}
		// Check if the ldap user is expired
		const ldapExpireOn: number = new Date(_.get(idpUserInfo, 'session_not_on_or_after', 0)).getTime();
		if (Date.now() > ldapExpireOn) {
			return false;
		}
		// TODO check if ldap user has access to avo2 app

		const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
		return !!avoUserInfo;
	}

	public static getUserInfoFromSession(request: Express.Request): Avo.User.User | null {
		return _.get(request, 'session.userInfo', null);
	}

	public static async getAvoUserInfoFromDatabase(ldapUserInfo: LdapUser): Promise<SharedUser> {
		const email = ldapUserInfo.name_id;
		return await AuthService.getAvoUserInfoByEmail(email);
	}
}
