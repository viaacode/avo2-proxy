import _ from 'lodash';
import { LdapUser } from './service';

interface AvoSessionCookie extends Express.SessionCookieData {
	ldapUser: LdapUser | null;
}

export default class AuthController {

	public static isAuthenticated(request: Express.Request): boolean {
		const ldapUser: LdapUser | null = this.getLdapUserFromSession(request);
		const ldapExpireOn: number = new Date(_.get(ldapUser, 'session_not_on_or_after', 0)).getTime();
		return Boolean(
			// Check nodejs session expiry
			_.get(request, 'session.maxAge', 0) > 0 &&
			// Should have ldap user
			ldapUser &&
			// Check ldap user expire
			Date.now() < ldapExpireOn,
			// Check if ldap user has access to avo2 app
			// TODO check if ldap user has access to avo2 app
		);
	}

	public static getLdapUserFromSession(request: Express.Request): LdapUser | null {
		return _.get(request, 'session.cookie.ldapUser', null);
	}

	public static setLdapUserOnSession(request: Express.Request, ldapUser: LdapUser): void {
		_.set(request, 'session.cookie.ldapUser', ldapUser);
	}
}
