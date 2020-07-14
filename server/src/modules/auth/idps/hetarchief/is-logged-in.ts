import { Request } from 'express';
import * as _ from 'lodash';

import { IdpHelper } from '../../idp-helper';
import { IdpType, LdapUser } from '../../types';

export default function isLoggedIn(request: Request): boolean {
	const idpType: IdpType | null = IdpHelper.getIdpTypeFromSession(request);
	if (!idpType) {
		return false;
	}
	if (idpType !== 'HETARCHIEF') {
		return false;
	}

	// Check if ldap user object is present on session
	const idpUserInfo: LdapUser | null = IdpHelper.getIdpUserInfoFromSession(request);
	if (!idpUserInfo) {
		return false;
	}
	// Check if the ldap user is expired
	const ldapExpireOn: number = new Date(
		_.get(idpUserInfo, 'session_not_on_or_after', 0)
	).getTime();
	if (Date.now() > ldapExpireOn) {
		return false;
	}

	// Check if ldap user has access to avo
	if (!_.get(idpUserInfo, 'attributes.apps', []).includes('avo')) {
		return false;
	}

	// Check if avo user is present on session
	const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);

	// Check if avo user has been blocked
	if (_.get(avoUserInfo, 'is_blocked')) {
		return false;
	}

	return !!avoUserInfo;
}
