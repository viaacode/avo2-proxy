import { Context, Path, ServiceContext, GET, QueryParam } from 'typescript-rest';

import AuthController from './controller';
import { logger } from '../../shared/helpers/logger';
import { InternalServerError } from '../../shared/helpers/error';
import { LoginResponse } from './types';

@Path('/auth')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	@Path('check-login')
	@GET
	async checkLogin(): Promise<LoginResponse> {
		try {
			return await AuthController.getLoginResponse(this.context.request);
		} catch (err) {
			logger.info('check login: error', err);
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		return AuthController.getIdpSpecificLogoutPage(this.context.request, returnToUrl);
	}
}
