import axios, { AxiosResponse } from 'axios';
import queryString from 'query-string';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';

import { SyncratorToken } from './mam-syncrator.types';

export default class MamSyncratorService {
	private static authToken: SyncratorToken;
	private static authTokenExpire: Date;
	private static tokenPromise: Promise<SyncratorToken> | null;

	private static async getAuthTokenFromNetwork(): Promise<SyncratorToken> {
		let url: string | undefined;
		let data: { username: string; password: string; grant_type: string } | undefined;
		try {
			// Fetch new access token
			url = process.env.SYNCRATOR_AUTH_SERVER_URL as string;
			data = {
				username: process.env.SYNCRATOR_AUTH_USERNAME as string,
				password: process.env.SYNCRATOR_AUTH_PASSWORD as string,
				grant_type: 'client_credentials',
			};
			const authTokenResponse: AxiosResponse<SyncratorToken> = await axios.post(
				url,
				queryString.stringify(data)
			);

			if (authTokenResponse.status < 200 || authTokenResponse.status >= 400) {
				throw new InternalServerError(
					'Response code from auth service indicates failure',
					null,
					{ authTokenResponse }
				);
			}

			return authTokenResponse.data;
		} catch (err) {
			throw new InternalServerError(
				'Failed to get JWT token from syncrator auth server',
				err,
				{
					url,
					data,
					SYNCRATOR_AUTH_SERVER_URL: process.env.SYNCRATOR_AUTH_SERVER_URL,
					SYNCRATOR_AUTH_USERNAME: process.env.SYNCRATOR_AUTH_USERNAME,
				}
			);
		}
	}

	private static async getAuthToken(): Promise<SyncratorToken> {
		try {
			if (MamSyncratorService.tokenPromise) {
				// Token call in progress, return the same promise that is in progress
				return MamSyncratorService.tokenPromise;
			}

			if (
				!MamSyncratorService.authToken ||
				MamSyncratorService.authTokenExpire < new Date()
			) {
				// We need to get a token the first time the search api is called or
				// when the token in the cache is expired
				MamSyncratorService.tokenPromise = MamSyncratorService.getAuthTokenFromNetwork();
				MamSyncratorService.authToken = await MamSyncratorService.tokenPromise;
				MamSyncratorService.authTokenExpire = new Date(
					new Date().getTime() + MamSyncratorService.authToken.expires_in * 1000
				); // Refresh token every 5 min
				MamSyncratorService.tokenPromise = null;
				return MamSyncratorService.authToken;
			}
			// Return cached token
			return MamSyncratorService.authToken;
		} catch (err) {
			MamSyncratorService.tokenPromise = null;
			throw new ExternalServerError('Failed to get token for syncrator auth service', err);
		}
	}

	static async triggerDeltaSync(): Promise<string> {
		let url: string;
		try {
			checkRequiredEnvs([
				'SYNCRATOR_API',
				'SYNCRATOR_AUTH_SERVER_URL',
				'SYNCRATOR_AUTH_USERNAME',
				'SYNCRATOR_AUTH_PASSWORD',
			]);

			url = `${process.env.SYNCRATOR_API}/delta/avo`;
			const token = await MamSyncratorService.getAuthToken();
			const response: AxiosResponse = await axios({
				url,
				headers: {
					Authorization: `Bearer ${token.access_token}`,
				},
				method: 'post',
			});
			return response.data.result;
		} catch (err) {
			throw new ExternalServerError('Failed to trigger MAM syncrator delta run', err, {
				url,
			});
		}
	}
}
