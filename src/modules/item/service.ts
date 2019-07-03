import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import {Avo} from '@viaa/avo2-types';

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

export default class ItemService {
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
		if (ItemService.tokenPromise) {
			// Token call in progress, return the same promise that is in progress
			return ItemService.tokenPromise;
		}

		if (!ItemService.authToken || ItemService.authTokenExpire < new Date()) {
			// We need to get a token the first time the search api is called or
			// when the token in the cache is expired
			ItemService.tokenPromise = ItemService.getAuthTokenFromNetwork();
			ItemService.authToken = await ItemService.tokenPromise;
			ItemService.authTokenExpire = new Date(new Date().getTime() + 5 * 60 * 1000); // Refresh token every 5 min
			ItemService.tokenPromise = null;
			return ItemService.authToken;
		}
		// Return cached token
		return ItemService.authToken;
	}

	public static async get(id: string): Promise<Avo.Item.Response> {
		let url;
		try {
			url = process.env.ELASTICSEARCH_URL; // TODO replace this with the graphql endpoint once data is available
			const token: string = await ItemService.getAuthToken();
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
					...convertArrayProperties(_.get(esResponse, 'data.hits.hits[0]._source')),
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

interface ElasticsearchResult {
	id: string;
	external_id?: string;
	administrative_external_id?: string;
	pid?: string;
	table_name: string;
	dc_title: string;
	dc_titles_serie: string;
	thumbnail_path: string;
	original_cp: string;
	original_cp_id: string;
	lom_context: string;
	lom_keywords: string;
	lom_languages: string;
	dcterms_issued: string;
	dcterms_abstract: string;
	lom_classification: string;
	lom_typical_age_range: string;
	lom_intended_enduser_role: string;
	briefing_id: string[];
	duration_time: string;
	duration_seconds: number;
	administrative_type: Avo.Core.ContentType;
}

const stringArrayProperties = [
	'lom_languages',
	'lom_context',
	'lom_keywords',
	'lom_languages',
	'lom_classification',
	'lom_typical_age_range',
	'lom_intended_enduser_role',
];

export function convertArrayProperties(elasticSearchResult: ElasticsearchResult): Avo.Item.Response {
	const itemResponse: Avo.Item.Response = elasticSearchResult as any;
	stringArrayProperties.forEach((stringArrayProperty: string) => {
		try {
			if (_.isString(elasticSearchResult[stringArrayProperty])) {
				itemResponse[stringArrayProperty] = JSON.parse(elasticSearchResult[stringArrayProperty]);
			} else if (!_.isArray(elasticSearchResult[stringArrayProperty])) {
				// TODO log this to VIAA log pipeline
				console.error('Expected string array in elasticsearch response for property ', stringArrayProperty, elasticSearchResult);
				itemResponse[stringArrayProperty] = [];
			}
		} catch (err) {
			console.error('Failed to parse string array in elasticsearch result', stringArrayProperty, elasticSearchResult); // TODO log this to VIAA log pipeline
			itemResponse[stringArrayProperty] = [];
		}
	});
	return itemResponse;
}
