import { Context, Path, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { InternalServerError } from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import SmartschoolService from './service';
import SmartschoolController, { LoginErrorResponse, LoginSuccessResponse, SmartschoolUserLoginResponse } from './controller';
import { IdpHelper } from '../../idp-helper';
import _ from 'lodash';
import { LINK_ACCOUNT_PATH, LinkAccountInfo } from '../../route';
import * as querystring from 'querystring';

const REDIRECT_URL_PATH = 'request.session.returnToUrl';

@Path('/auth/smartschool')
export default class SmartschoolRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			_.set(this.context, REDIRECT_URL_PATH, returnToUrl);
			const url = SmartschoolService.getRedirectUrlForCode();
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
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
				return new Return.MovedTemporarily(`http://localhost:8080/error?message=${(userOrError as LoginErrorResponse).error}`);
			}

			const response: LoginSuccessResponse = userOrError as LoginSuccessResponse;

			const redirectUrl = _.get(this.context, REDIRECT_URL_PATH);
			if (redirectUrl.includes(process.env.HOST)) {
				// User had to login, to link smartschool account to an existing hetarchief or viaa account
				const linkAccountInfo: LinkAccountInfo = {
					userObject: response.smartschoolUserInfo,
					type: 'SMARTSCHOOL',
				};
				_.set(this.context, LINK_ACCOUNT_PATH, linkAccountInfo);
			} else {
				// User is logging in to enter avo using their smartschool account
				// Check if accounts are linked
				if (!response.avoUser) {
					return new Return.MovedTemporarily(`http://localhost:8080/error?${querystring.stringify({
						message: 'Gelieve eerst in te loggen met je avo account en je smartschool te koppelen in je account instellingen',
						icon: 'link',
					})}`);
				}
				IdpHelper.setIdpUserInfoOnSession(this.context.request, response.smartschoolUserInfo, 'SMARTSCHOOL');
				IdpHelper.setAvoUserInfoOnSession(this.context.request, response.avoUser);
			}

			return new Return.MovedTemporarily(redirectUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error; // TODO redirect to failed login page
		}
	}

	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		IdpHelper.logout(this.context.request);
		return new Return.MovedTemporarily(returnToUrl);
	}
}
