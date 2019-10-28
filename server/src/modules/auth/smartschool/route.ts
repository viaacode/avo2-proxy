import { Context, Path, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { CustomError } from '../../../shared/helpers/error';
import { logger } from '../../../shared/helpers/logger';
import * as querystring from 'querystring';
import { set, get } from 'lodash';
import Axios from 'axios';
import SmartschoolService from './service';

@Path('/auth/smartschool')
export default class SmartschoolRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			set(this.context, 'request.session.returnToUrl', returnToUrl);
			// const serverUrl = `${process.env.HOST}/auth/smartschool/login-callback`;
			// const url = `https://oauth.smartschool.be/OAuth?${querystring.stringify({
			// 	client_id: process.env.SMARTSCHOOL_CLIENT_ID,
			//   redirect_uri: serverUrl,
			// 	response_type: 'code',
			// 	scope: 'userinfo',
			// })}`;
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
			try {
				const user = await SmartschoolService.getToken(this.context.request.originalUrl);
				logger.log('smartschool code: ', code);
				logger.log('smartschool tokens: ', user);
				// const response = await Axios.get(`https://oauth.smartschool.be/OAuth/index/token?${querystring.stringify({
				// 	code,
				// 	clientId: process.env.SMARTSCHOOL_CLIENT_ID,
				// 	clientSecret: process.env.SMARTSCHOOL_CLIENT_PASSWORD,
				// 	accessTokenUri: 'https://oauth.smartschool.be/OAuth/index/access_token',
				// 	authorizationUri: 'https://oauth.smartschool.be/OAuth',
				// 	redirectUri: `${process.env.HOST}/auth/smartschool/login-callback`,
				// 	scopes: ['userinfo'],
				// })}`);
				logger.log(user);
				return new Return.MovedTemporarily(get(this.context, 'request.session.returnToUrl'));
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
