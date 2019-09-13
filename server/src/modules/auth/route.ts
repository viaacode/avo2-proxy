import { Context, Path, POST, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import AuthController from './controller';
import AuthService, { LdapUser, SamlCallbackBody } from './service';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

interface RelayState {
	returnToUrl: string;
}

@Path('/auth')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	/**
	 * Check if user has active session
	 * - If he does: redirect to "returnTo" query param url
	 * - Otherwise redirect to SAML login page
	 */
	@Path('check-login')
	@GET
	async checkLogin(): Promise<any> {
		try {
			if (AuthController.isAuthenticated(this.context.request)) {
				return { message: 'LOGGED_IN' };
			}
			return { message: 'LOGGED_OUT' };
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	/**
	 * Check if user has active session
	 * - If he does: redirect to "returnTo" query param url
	 * - Otherwise redirect to SAML login page
	 */
	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			if (AuthController.isAuthenticated(this.context.request)) {
				return new Return.MovedTemporarily<void>(returnToUrl);
			}
			const url = await AuthService.createLoginRequestUrl(returnToUrl);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	/**
	 * Called by SAML service to return LDAP info if user successfully logged in
	 * This function has to redirect the browser back to the app once the information is stored in the user's session
	 */
	@Path('login-callback')
	@POST
	async loginCallback(response: SamlCallbackBody): Promise<any> {
		try {
			try {
				const ldapUser: LdapUser = await AuthService.assertSamlResponse(response);
				const info: RelayState = JSON.parse(response.RelayState);

				AuthController.setLdapUserOnSession(this.context.request, ldapUser);

				return new Return.MovedTemporarily(info.returnToUrl);
			} catch (err) {
				// Failed to login
				logger.error(err); // TODO redirect to failed login page
			}
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	/**
	 * Redirect the user to the logout page on the SAML identity server
	 * The SAML service will then redirect the browser back to the callback url
	 */
	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			const ldapUser: LdapUser | null = AuthController.getLdapUserFromSession(this.context.request);

			// Remove the ldap user from the session
			AuthController.setLdapUserOnSession(this.context.request, null);

			if (ldapUser) {
				// Logout by redirecting to the identity server logout page
				const url = await AuthService.createLogoutRequestUrl(ldapUser.name_id, returnToUrl);
				return new Return.MovedTemporarily<void>(url);
			}
			logger.error(new CustomError(
				'ldap user wasn\'t found on the session',
				null,
				{ returnToUrl },
			));
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	/**
	 * Called by SAML service to let the proxy know what the logout status is of the user after a logout attempt
	 * This function has to redirect the browser back to the app
	 */
	@Path('logout-callback')
	@POST
	async logoutCallback(response: SamlCallbackBody): Promise<any> {
		try {
			try {
				const info: RelayState = JSON.parse(response.RelayState);

				return new Return.MovedTemporarily(info.returnToUrl);
			} catch (err) {
				// Failed to login
				logger.error(err); // TODO redirect to failed login page
			}
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}
}
