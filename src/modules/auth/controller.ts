import _, { get } from 'lodash';

interface AvoSessionCookie extends Express.SessionCookieData {
	isAuthenticated: boolean;
}

export default class AuthController {

	public static isAuthenticated(session: Express.Session | undefined): boolean {
		return Boolean(session) && _.get(session, 'maxAge', 0) > 0 && get(session, 'cookie.isAuthenticated');
	}
}
