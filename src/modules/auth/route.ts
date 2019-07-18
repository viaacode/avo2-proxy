import { Context, Path, POST, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import AuthController from './controller';
import queryString from 'query-string';
import passport from 'passport';
import AuthService, { LdapUser, SamlCallbackBody } from './service';

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
				return {message: 'LOGGED_IN'};
			} else {
				return {message: 'LOGGED_OUT'};
			}
		} catch (err) {
			const error = new RecursiveError('Failed during auth login route', err, {});
			console.error(error.toString());
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
			} else {
				const url = await AuthService.createLoginRequestUrl(returnToUrl);
				return new Return.MovedTemporarily<void>(url);
			}
		} catch (err) {
			const error = new RecursiveError('Failed during auth login route', err, {});
			console.error(error.toString());
			throw error;
		}
	}

	/**
	 * Called by SAML service to return LDAP info if user successfully logged in
	 * This function has to redirect the browser back to the app once the information is stored in the user's session
	 */
	@Path('callback')
	@POST
	async callback(response: SamlCallbackBody): Promise<any> {
		try {
			try {
				// TODO Enable once we certificates enabled
				const ldapUser: LdapUser = await AuthService.assertSamlResponse(response);
				const info: RelayState = JSON.parse(response.RelayState);

				AuthController.setLdapUserOnSession(this.context.request, ldapUser);

				return new Return.MovedTemporarily(info.returnToUrl);
			} catch (err) {
				// Failed to login
				console.error(err); // TODO redirect to failed login page
			}
		} catch (err) {
			const error = new RecursiveError('Failed during auth login route', err, {});
			console.error(error.toString());
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
			const url = await AuthService.createLogoutRequestUrl(returnToUrl);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new RecursiveError('Failed during auth login route', err, {});
			console.error(error.toString());
			throw error;
		}
	}

	//
	// /**
	//  * SAML Identity server callback endpoint
	//  */
	// @Path('setSamlResponse')
	// @POST
	// async setSamlResponse(samlResponse: string): Promise<any> {
	// 	try {
	// 		console.log('saml response', samlResponse);
	// 		return { message: 'LOGGED_IN' };
	// 	} catch (err) {
	// 		const error = new RecursiveError('failed during auth callback route', err, { samlResponse });
	// 		console.error(error.toString());
	// 		throw error;
	// 	}
	// }
}
