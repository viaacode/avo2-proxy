import * as axios from 'axios';
import * as _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import { ISearchResponse } from './types';

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

export default class SearchService {
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
			const authTokenResponse: axios.AxiosResponse<AuthTokenResponse> = await axios.default({
				method: 'post',
				url,
				data,
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
		if (SearchService.tokenPromise) {
			// Token call in progress, return the same promise that is in progress
			return SearchService.tokenPromise;
		} else if (!SearchService.authToken || SearchService.authTokenExpire > new Date()) {
			// We need to get a token the first time the search api is called or
			// when the token in the cache is expired
			SearchService.tokenPromise = SearchService.getAuthTokenFromNetwork();
			SearchService.authToken = await SearchService.tokenPromise;
			SearchService.tokenPromise = null;
			return SearchService.authToken;
		} else {
			// Return cached token
			return SearchService.authToken;
		}
	}

	public static async search(searchQueryObject: any): Promise<ISearchResponse> {
		const url = process.env.ELASTICSEARCH_URL;
		const token: string = await SearchService.getAuthToken();
		const esResponse: axios.AxiosResponse<ElasticsearchResponse> = await axios.default({
			method: 'post',
			url,
			headers: {
				Authorization: token,
			},
			data: searchQueryObject,
		});

		// Handle response
		if (esResponse.status >= 200 && esResponse.status < 400) {
			// Return search results
			return {
				count: _.get(esResponse, 'data.hits.total'),
				results: _.map(_.get(esResponse, 'data.hits.hits'), '_source'),
			};
		} else {
			throw new RecursiveError(
				'Failed to make search call to elasticsearch',
				null,
				{
					url,
					method: 'post',
					searchQueryObject,
					status: esResponse.status,
					statusText: esResponse.statusText,
				});
		}
	}
}
