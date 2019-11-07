import { Context, Path, ServiceContext, GET } from 'typescript-rest';
import AuthController from './controller';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
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
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}
}
