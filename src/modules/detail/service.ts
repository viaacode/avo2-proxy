import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import { DetailResponse } from './types';

interface ElasticsearchResponse {
	took: number;
	timed_out: boolean;
	_shards: {
		total: number;
		successful: number;
		skipped: number;
		failed: number;
	};
	hits: {
		total: number;
		max_score: number;
		hits: any[];
	};
	aggregations: any;
}

interface AuthTokenResponse {
	graphql_api_url: string;
	authorization_token: string;
	status: string;
}

export default class DetailService {
	private static authToken: string;
	private static authTokenExpire: Date;
	private static tokenPromise: Promise<string> | null;

	private static async getAuthTokenFromNetwork(): Promise<string> {
		let url: string | undefined;
		let data: { username: string, password: string } | undefined;
		try {
			// Fetch new token
			url = process.env.ELASTICSEARCH_AUTH_SERVER_URL as string;
			data = {
				username: process.env.ELASTICSEARCH_AUTH_USERNAME as string,
				password: process.env.ELASTICSEARCH_AUTH_PASSWORD as string,
			};
			const authTokenResponse: AxiosResponse<AuthTokenResponse> = await axios({
				url,
				data,
				method: 'post',
			});
			return authTokenResponse.data.authorization_token;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get JWT token from auth server',
				err,
				{ url, data });
		}
	}

	private static async getAuthToken(): Promise<string> {
		if (DetailService.tokenPromise) {
			// Token call in progress, return the same promise that is in progress
			return DetailService.tokenPromise;
		}

		if (!DetailService.authToken || DetailService.authTokenExpire < new Date()) {
			// We need to get a token the first time the search api is called or
			// when the token in the cache is expired
			DetailService.tokenPromise = DetailService.getAuthTokenFromNetwork();
			DetailService.authToken = await DetailService.tokenPromise;
			DetailService.authTokenExpire = new Date(new Date().getTime() + 5 * 60 * 1000); // Refresh token every 5 min
			DetailService.tokenPromise = null;
			return DetailService.authToken;
		}
		// Return cached token
		return DetailService.authToken;

	}

	public static async get(id: string): Promise<DetailResponse> {
		let url;
		try {
			url = process.env.ELASTICSEARCH_URL; // TODO replace this with the graphql endpoint once data is available
			const token: string = await DetailService.getAuthToken();
			const esResponse: AxiosResponse<ElasticsearchResponse> = await axios({
				url,
				method: 'post',
				headers: {
					Authorization: token,
				},
				data: {
					size: 1,
					query: {
						term: {
							_id: id,
						},
					},
				},
			});

			// Handle response
			if (esResponse.status >= 200 && esResponse.status < 400) {
				return {
					..._.get(esResponse, 'data.hits.hits[0]._source'),
					id: _.get(esResponse, 'data.hits.hits[0]._id'),
				};
			}
			throw new RecursiveError(
				'Request to elasticsearch was unsuccessful',
				null,
				{
					url,
					id,
					method: 'post',
					status: esResponse.status,
					statusText: esResponse.statusText,
				});

		} catch (err) {
			throw new RecursiveError(
				'Failed to make request to elasticsearch',
				err,
				{
					url,
					id,
					method: 'post',
				});
		}
	}
}
