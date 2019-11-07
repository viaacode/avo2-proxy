import { Context, Path, ServiceContext, GET } from 'typescript-rest';
import AuthController from './controller';
import { IdpHelper } from './idp-adapter';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';

@Path('/auth')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	@Path('check-login')
	@GET
	async checkLogin(): Promise<any> {
		try {
			if (AuthController.isAuthenticated(this.context.request)) {
				logger.info('check login: user is authenticated');
				const userInfo = await IdpHelper.getAvoUserInfoFromSession(this.context.request);
				return {
					userInfo,
					message: 'LOGGED_IN',
				};
			}
			logger.info('check login: user is not authenticated');
			return { message: 'LOGGED_OUT' };
		} catch (err) {
			logger.info('check login: error', err);
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}
}
