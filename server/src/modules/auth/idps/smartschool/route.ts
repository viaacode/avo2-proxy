import { Context, Path, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { CustomError } from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import { set, get } from 'lodash';
import SmartschoolService  from './service';
import SmartschoolController, { LoginErrorResponse, LoginSuccessResponse, SmartschoolUserLoginResponse } from './controller';
import { IdpHelper } from '../../idp-adapter';

const REDIRECT_URL_PATH = 'request.session.returnToUrl';

@Path('/auth/smartschool')
export default class SmartschoolRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			set(this.context, REDIRECT_URL_PATH, returnToUrl);
			const url = SmartschoolService.getRedirectUrlForCode();
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
			const userOrError: SmartschoolUserLoginResponse = await SmartschoolController.getUserFromSmartschoolLogin(code);
			if ((userOrError as LoginErrorResponse).error) {
				// TODO redirect to error login page

				return new Return.MovedTemporarily(`http://localhost:8080/login-or-register?error=${(userOrError as LoginErrorResponse).error}`);
			} else {
				const response: LoginSuccessResponse = userOrError as LoginSuccessResponse;
				IdpHelper.setIdpUserInfoOnSession(this.context.request, response.smartschoolUserInfo, 'SMARTSCHOOL');
				IdpHelper.setAvoUserInfoOnSession(this.context.request, response.avoUser);

				return new Return.MovedTemporarily(get(this.context, REDIRECT_URL_PATH));
			}
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error; // TODO redirect to failed login page
		}
	}
}
