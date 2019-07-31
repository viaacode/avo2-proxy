import _ from 'lodash';
import { LdapUser } from './service';
import { RecursiveError } from '../../helpers/recursiveError';

interface AvoSession extends Express.SessionCookieData {
	ldapUser: LdapUser | null;
}

export default class AuthController {

	public static isAuthenticated(request: Express.Request): boolean {
		if (!_.get(request, 'session.cookie')) {
			return false;
		}
		const session: Express.Session = request.session as Express.Session;
		const ldapUser: LdapUser | null = this.getLdapUserFromSession(request);
		const ldapExpireOn: number = new Date(_.get(ldapUser, 'session_not_on_or_after', 0)).getTime();
		return Boolean(
			// Check nodejs session expiry
			session.cookie.expires.valueOf() > Date.now() &&
			// Should have ldap user
			ldapUser &&
			// Check ldap user expire
			Date.now() < ldapExpireOn,
			// Check if ldap user has access to avo2 app
			// TODO check if ldap user has access to avo2 app
		);
	}

	public static getLdapUserFromSession(request: Express.Request): LdapUser | null {
		return _.get(request, 'session.ldapUser', null);
	}

	public static setLdapUserOnSession(request: Express.Request, ldapUser: LdapUser | null): void {
		if (request.session) {
			request.session.ldapUser = ldapUser;
			_.set(request, 'session.ldapUser', ldapUser);
		} else {
			throw new RecursiveError(
				'Failed to store session during setLdapUserOnSession because no session was found on request',
				null,
				{ ldapUser },
			);
		}
	}
}
