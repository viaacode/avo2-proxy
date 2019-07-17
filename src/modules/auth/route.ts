import { Context, Path, POST, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import AuthController from './controller';
import queryString from 'query-string';
import passport from 'passport';
import AuthService from './service';

@Path('/auth')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	/**
	 * Check if user has active session
	 * - If he does: redirect to "returnTo" query param url
	 * - Otherwise redirect to SAML login page
	 */
	@Path('login')
	@GET
	async login(@QueryParam('callbackUrl') callbackUrl: string, @QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			if (AuthController.isAuthenticated(this.context.request.session)) {
				return new Return.MovedTemporarily<void>(returnToUrl);
			} else {
				const url = await AuthService.createLoginRequestUrl(callbackUrl, returnToUrl);
				return new Return.MovedTemporarily<void>(url);
			}
		} catch (err) {
			const error = new RecursiveError('Failed during auth login route', err, {});
			console.error(error.toString());
			throw error;
		}
	}

	/**
	 * SAML Identity server callback endpoint
	 */
	@Path('setSamlResponse')
	@POST
	async setSamlResponse(samlResponse: string): Promise<any> {
		try {
			console.log('saml response', samlResponse);
			return {message: 'LOGGED_IN'};
		} catch (err) {
			const error = new RecursiveError('failed during auth callback route', err, { samlResponse });
			console.error(error.toString());
			throw error;
		}
	}
}
