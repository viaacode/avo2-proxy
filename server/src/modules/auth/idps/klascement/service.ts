import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import simpleOauth2, { AccessToken, OAuthClient } from 'simple-oauth2';

import { checkRequiredEnvs } from '../../../../shared/helpers/env-check';
import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { logIfNotTestEnv } from '../../../../shared/helpers/logger';

export interface KlascementToken {
	access_token: string;
	expires_in: number;
	token_type: string;
	user_id: string;
	scope: string;
	refresh_token: string;
}

export interface KlascementUserInfo {
	id: string;
	email: string;
	surname: string;
	first_name: string;
}

checkRequiredEnvs([
	'KLASCEMENT_CLIENT_ID',
	'KLASCEMENT_CLIENT_PASSWORD',
]);

export default class KlascementService {
	private static oauth2: OAuthClient;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	public static async initialize() {
		logIfNotTestEnv('caching idp klascement...');
		KlascementService.oauth2 = simpleOauth2.create({
			client: {
				id: process.env.KLASCEMENT_CLIENT_ID as string,
				secret: process.env.KLASCEMENT_CLIENT_PASSWORD as string,
			},
			auth: {
				tokenHost: 'https://www.klascement.net',
				tokenPath: '/oauth/token',
				authorizeHost: 'https://www.klascement.net',
				authorizePath: '/oauth/authorize',
			},
			options: {
				bodyFormat: 'form',
				authorizationMethod: 'body',
			},
		});
		logIfNotTestEnv('caching idp klascement... done');
	}

	public static getRedirectUrlForCode(uuid: string): string {
		return this.oauth2.authorizationCode.authorizeURL({
			redirect_uri: `${process.env.HOST}/auth/klascement/login-callback`,
			scope: 'name email',
			state: uuid,
		});
	}

	public static async getToken(code: string): Promise<KlascementToken> {
		try {
			const result = await this.oauth2.authorizationCode.getToken({
				code,
				redirect_uri: `${process.env.HOST}/auth/klascement/login-callback`,
				scope: 'name email',
				response_type: 'code',
			} as any); // TODO remove cast to any once PR is accepted: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/39940
			const response: AccessToken = this.oauth2.accessToken.create(result);
			return response.token as KlascementToken;
		} catch (err) {
			throw new CustomError('Failed to get token for klascement', err, { code });
		}
	}

	public static async getUserInfo(accessToken: string, userId: string): Promise<KlascementUserInfo> {
		const url = `https://www.klascement.net/api/users/${userId}?access_token=${accessToken}`;
		try {
			const response: AxiosResponse<any> = await axios(url, {
				method: 'get',
			});
			return _.get(response, 'data.content.objects[0]', null);
		} catch (err) {
			throw new InternalServerError('Failed to get userinfo from klascement api', err, { url });
		}
	}
}
