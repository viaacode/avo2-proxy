import { Context, Path, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { CustomError } from '../../../shared/helpers/error';
import { logger } from '../../../shared/helpers/logger';
import * as querystring from 'querystring';

@Path('/auth/smartschool')
export default class SmartschoolRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			const serverUrl = `${process.env.HOST}/auth/smartschool/login-callback?returnUrl=${encodeURIComponent(returnToUrl)}`;
			// TODO store redirect url in session
			const url = `https://oauth.smartschool.be/OAuth?${querystring.stringify({
				client_id: process.env.SMARTSCHOOL_CLIENT_ID,
			  redirect_uri: encodeURIComponent(serverUrl),
				response_type: 'code',
				scope: 'userinfo',
			})}`;
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new CustomError('Failed during auth login route', err, {});
			logger.error(error.toString());
			throw error;
		}
	}

	@Path('login-callback')
	@GET
	async loginCallback(@QueryParam('code') code: string, @QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			try {
				logger.log('smartschool code: ', code);
				// Axios.get(`https://oauth.smartschool.be/OAuth/index/token`)
				return new Return.MovedTemporarily(returnToUrl);
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
