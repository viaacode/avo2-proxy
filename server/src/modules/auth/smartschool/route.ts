import { Context, Path, POST, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import AuthController from './controller';
import { CustomError } from '@shared/helpers/error';
import { logger } from '@shared/helpers/logger';

interface RelayState {
	returnToUrl: string;
}

@Path('/auth/smartschool')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			// if (AuthController.isAuthenticated(this.context.request)) {
			// 	return new Return.MovedTemporarily<void>(returnToUrl);
			// }
			const serverUrl = `${process.env.HOST}/auth/smartschool/login-callback`;
			const url = `/OAuth?client_id=${process.env.SMARTSCHOOL_CLIENT_ID}&redirect_uri=${serverUrl}&response_type=code&scope=userinfo`;
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	@Path('login-callback')
	@GET
	async loginCallback(@QueryParam('code') code: string): Promise<any> {
		try {
			try {


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

	@Path('logout')
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
