import { Request } from 'express';

import { IdpHelper } from '../../idp-helper';

export default function isLoggedIn(request: Request): boolean {
	if (IdpHelper.isSessionExpired(request)) {
		return false;
	}
	const avoUserInfo = IdpHelper.getAvoUserInfoFromSession(request);
	return !!avoUserInfo;
}
