import ClientOAuth2 from 'client-oauth2';
import { CustomError } from '../../../shared/helpers/error';

if (!process.env.SMARTSCHOOL_CLIENT_ID) {
	throw new CustomError('The environment variable SMARTSCHOOL_CLIENT_ID should have a value.');
}
if (!process.env.SMARTSCHOOL_CLIENT_PASSWORD) {
	throw new CustomError('The environment variable SMARTSCHOOL_CLIENT_PASSWORD should have a value.');
}

export default class SmartschoolService {
	private static smartschoolAuth: ClientOAuth2;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	public static async initialize() {
		SmartschoolService.smartschoolAuth = new ClientOAuth2({
			clientId: process.env.SMARTSCHOOL_CLIENT_ID,
			clientSecret: process.env.SMARTSCHOOL_CLIENT_PASSWORD,
			accessTokenUri: 'https://oauth.smartschool.be/OAuth/index/token',
			authorizationUri: 'https://oauth.smartschool.be/OAuth',
			redirectUri: `${process.env.HOST}/auth/smartschool/login-callback`,
			scopes: ['userinfo'],
			// scopes: ['userinfoviaa'],
		});
	}

	public static getRedirectUrlForCode(): string {
		return SmartschoolService.smartschoolAuth.code.getUri({
			query: {
				response_type: 'code',
			},
		});
	}

	public static getToken(originalUrl: string): Promise<any> {
		return SmartschoolService.smartschoolAuth.code.getToken(originalUrl);
	}
}
