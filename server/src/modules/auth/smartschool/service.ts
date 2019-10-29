// import ClientOAuth2 from 'client-oauth2';
import simpleOauth2, { OAuthClient, Token } from 'simple-oauth2';
import { CustomError } from '../../../shared/helpers/error';

if (!process.env.SMARTSCHOOL_CLIENT_ID) {
	throw new CustomError('The environment variable SMARTSCHOOL_CLIENT_ID should have a value.');
}
if (!process.env.SMARTSCHOOL_CLIENT_PASSWORD) {
	throw new CustomError('The environment variable SMARTSCHOOL_CLIENT_PASSWORD should have a value.');
}

export default class SmartschoolService {
	private static oauth2: OAuthClient;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	public static async initialize() {
		// passport.use(new OAuth2Strategy({
		// 		authorizationURL: 'https://oauth.smartschool.be/OAuth',
		// 		tokenURL: 'https://oauth.smartschool.be/OAuth/index/token',
		// 		clientID: process.env.SMARTSCHOOL_CLIENT_ID,
		// 		clientSecret: process.env.SMARTSCHOOL_CLIENT_PASSWORD,
		// 		callbackURL: `${process.env.HOST}/auth/smartschool/login-callback`,
		// 	},
		// 	(accessToken, refreshToken, profile, cb) => {
		// 		User.findOrCreate({ exampleId: profile.id }, function (err, user) {
		// 			return cb(err, user);
		// 		});
		// 	}
		// ));
		SmartschoolService.oauth2 = simpleOauth2.create({
			client: {
				id: process.env.SMARTSCHOOL_CLIENT_ID,
				secret: process.env.SMARTSCHOOL_CLIENT_PASSWORD,
			},
			auth: {
				tokenHost: 'https://oauth.smartschool.be',
				tokenPath: '/OAuth/index/token',
				authorizeHost: 'https://oauth.smartschool.be',
				authorizePath: '/OAuth',
			},
			options: {
				bodyFormat: 'form',
				authorizationMethod: 'body',
			},
		});
	}

	public static getRedirectUrlForCode(): string {
		return this.oauth2.authorizationCode.authorizeURL({
			redirect_uri: `${process.env.HOST}/auth/smartschool/login-callback`,
			scope: 'userinfo', // also can be an array of multiple scopes, ex. ['<scope1>, '<scope2>', '...']
			state: '',
		});
		// SmartschoolService.smartschoolAuth.code.getUri({
		// 	query: {
		// 		response_type: 'code',
		// 	},
		// });
	}

	public static async getToken(code: string): Promise<Token> {
		const result = await this.oauth2.authorizationCode.getToken({
			code,
			redirect_uri: `${process.env.HOST}/auth/smartschool/login-callback`,
			scope: 'userinfo',
		} as any); // TODO remove cast to any once PR is accepted: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/39940
		return this.oauth2.accessToken.create(result);
	}
}
