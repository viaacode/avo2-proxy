import _ from 'lodash';
import AuthService, { LdapUser, SharedUser } from './service';
import { CustomError } from '../../shared/helpers/error';
import { Avo } from '@viaa/avo2-types';

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
			throw new CustomError(
				'Failed to store session during setLdapUserOnSession because no session was found on request',
				null,
				{ ldapUser },
			);
		}
	}

	public static async getUserInfo(request: Express.Request): Promise<Avo.User.Response | null> {
		try {
			const ldapUser = this.getLdapUserFromSession(request);
			const email = ldapUser.name_id;
			const user: SharedUser = await AuthService.getUserInfo(email);
			if (!user) {
				return null;
			}

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
			return user as any;
		} catch (err) {
			throw new CustomError('Failed to get user info in controller', err);
		}
	}
}
