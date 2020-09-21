import { Request } from 'express';
import { get } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { IdpHelper } from '../../idp-helper';
import { LdapUser } from '../../types';

export default function isLoggedIn(request: Request): boolean {
	const idpType: Avo.Auth.IdpType | null = IdpHelper.getIdpTypeFromSession(request);
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
	const ldapExpireOn: number = new Date(get(idpUserInfo, 'session_not_on_or_after', 0)).getTime();
	if (Date.now() > ldapExpireOn) {
		return false;
	}

	// Check if ldap user has access to avo
	if (!get(idpUserInfo, 'attributes.apps', []).includes('avo')) {
		return false;
	}

	// Check if avo user is present on session
	const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);

	// Check if avo user has been blocked
	if (get(avoUserInfo, 'is_blocked')) {
		return false;
	}

	return !!avoUserInfo;
}
