import axios, { AxiosResponse } from 'axios';
import simpleOauth2, { AccessToken, OAuthClient } from 'simple-oauth2';

import { checkRequiredEnvs } from '../../../../shared/helpers/env-check';
import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { logger, logIfNotTestEnv } from '../../../../shared/helpers/logger';

export interface SmartschoolToken {
	token_type: string;
	expires_in: number;
	access_token: string;
	refresh_token: string;
	expires_at: string;
}

export interface SmartschoolUserInfo {
	userID: string;
	voornaam: string;
	naam: string;
	geboortedatum: string;
	email: string;
	klasnaam: string;
	nummer_adm_groep: string;
	instellingsnummer: number;
	basisrol: string;
	leerling: boolean;
	profielfoto: string;
	isMainAccount: number;
	isCoAccount: number;
	nrCoAccount: number;
	typeCoAccount: string;
	actualUserName: string;
	actualUserSurname: string;
}

checkRequiredEnvs([
	'SMARTSCHOOL_CLIENT_ID',
	'SMARTSCHOOL_CLIENT_PASSWORD',
]);

export default class SmartschoolService {
	private static oauth2: OAuthClient;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	public static async initialize() {
		logIfNotTestEnv('caching idp smartschool...');
		SmartschoolService.oauth2 = simpleOauth2.create({
			client: {
				id: process.env.SMARTSCHOOL_CLIENT_ID as string,
				secret: process.env.SMARTSCHOOL_CLIENT_PASSWORD as string,
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
		logIfNotTestEnv('caching idp smartschool... done');
	}

	public static getRedirectUrlForCode(): string {
		return this.oauth2.authorizationCode.authorizeURL({
			redirect_uri: `${process.env.HOST}/auth/smartschool/login-callback`,
			scope: 'userinfoviaa',
		});
	}

	public static async getToken(code: string): Promise<SmartschoolToken> {
		try {
			const result = await this.oauth2.authorizationCode.getToken({
				code,
				redirect_uri: `${process.env.HOST}/auth/smartschool/login-callback`,
				scope: 'userinfoviaa',
				response_type: 'code',
			} as any); // TODO remove cast to any once PR is accepted: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/39940
			const response: AccessToken = this.oauth2.accessToken.create(result);
			return response.token as SmartschoolToken;
		} catch (err) {
			throw new CustomError('Failed to get smartschool oauth token', err, { code });
		}
	}

	public static async getUserInfo(accessToken: string): Promise<any> {
		const url = `https://oauth.smartschool.be/Api/V1/userinfoviaa?access_token=${accessToken}`;
		try {
			const response: AxiosResponse<any> = await axios(url, {
				method: 'get',
			});
			return response.data;
		} catch (err) {
			throw new InternalServerError('Failed to get userinfo from smartschool api', err, { url });
		}
	}
}
