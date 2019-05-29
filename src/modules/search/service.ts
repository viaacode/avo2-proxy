import axios, { AxiosResponse } from 'axios';
import * as _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import { FilterOptions, SearchResponse } from './types';

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

interface Aggregations {
	[prop: string]: {
		buckets: {
			[bucketName: string]: {
				from?: number;
				to?: number;
				doc_count: number;
			};
		};
	} | {
		doc_count_error_upper_bound: number;
		sum_other_doc_count: number;
		buckets: { key: string, doc_count: number }[];
	};
}

interface SimpleBucket {
	option_name: string;
	option_count: number;
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
			const authTokenResponse: AxiosResponse<AuthTokenResponse> = await axios({
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

	public static async search(searchQueryObject: any): Promise<SearchResponse> {
		let url;
		try {
			url = process.env.ELASTICSEARCH_URL;
			const token: string = await SearchService.getAuthToken();
			const esResponse: AxiosResponse<ElasticsearchResponse> = await axios({
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
					aggregations: this.simplifyAggregations(_.get(esResponse, 'data.aggregations')),
				};
			} else {
				throw new RecursiveError(
					'Request to elasticsearch was unsuccessful',
					null,
					{
						url,
						method: 'post',
						searchQueryObject,
						status: esResponse.status,
						statusText: esResponse.statusText,
					});
			}
		} catch (err) {
			throw new RecursiveError(
				'Failed to make request to elasticsearch',
				err,
				{
					url,
					method: 'post',
					searchQueryObject,
				});
		}
	}

	/**
	 * Converts elasticsearch aggs result to simple list of options and counts per filter property
	 *
	 * Aggregations contain:
	 *   Either a simple list for each option
	 *      "lom_keywords.filter": {
	 *          "doc_count_error_upper_bound": 0,
	 *          "sum_other_doc_count": 0,
	 *          "buckets": [
	 *              {
	 *                  "key": "armoede",
	 *                  "doc_count": 2
	 *              },
	 *              {
	 *                  "key": "schulden",
	 *                  "doc_count": 2
	 *              },
	 *              {
	 *                  "key": "afbetaling",
	 *                  "doc_count": 1
	 *              }
	 *					]
	 *			}
	 *   or an object containing the ranged options
	 *      "fragment_duration_seconds": {
	 *          "buckets": {
	 *              "< 5 min": {
	 *                  "to": 300,
	 *                  "doc_count": 2
	 *              },
	 *              "5 - 15 min": {
	 *                  "from": 300,
	 *                  "to": 900,
	 *                  "doc_count": 0
	 *              },
	 *              "> 15 min": {
	 *                  "from": 900,
	 *                  "doc_count": 0
	 *              }
	 *          }
	 *      }
	 * and we will convert this to:
	 *      "lom_keywords.filter": [
	 *          {
	 *              "option_name": "armoede",
	 *              "option_count": 2
	 *          },
	 *          {
	 *              "option_name": "schulden",
	 *              "option_count": 2
	 *          },
	 *          {
	 *              "option_name": "afbetaling",
	 *              "option_count": 1
	 *          }
	 *      ],
	 *      "fragment_duration_seconds": [
	 *          {
	 *              "option_name": "< 5 min",
	 *              "option_count": 2
	 *          },
	 *          {
	 *              "option_name": "5 - 15 min",
	 *              "option_count": 0
	 *          },
	 *          {
	 *              "option_name": "> 15 min",
	 *              "option_count": 0
	 *          }
	 *      ]
	 * @param aggregations
	 */
	public static simplifyAggregations(aggregations: Aggregations): FilterOptions {
		const simpleAggs: FilterOptions = {};
		_.forEach(aggregations, (value, prop) => {
			if (_.isPlainObject(value.buckets)) {
				// range bucket object (eg: fragment_duration_seconds)
				const rangeBuckets = value.buckets as {
					[bucketName: string]: {
						from?: number;
						to?: number;
						doc_count: number;
					};
				};
				simpleAggs[prop] = (_.map(rangeBuckets, (bucketValue, bucketName): SimpleBucket => {
					return {
						option_name: bucketName,
						option_count: bucketValue.doc_count,
					};
				})) as unknown as SimpleBucket[]; // Issue with lodash typings: https://stackoverflow.com/questions/44467778
			} else {
				// regular bucket array (eg: administrative_type)
				const regularBuckets = value.buckets as { key: string, doc_count: number }[];
				simpleAggs[prop] = (_.map(regularBuckets, (bucketValue): SimpleBucket => {
					return {
						option_name: bucketValue.key,
						option_count: bucketValue.doc_count,
					};
				})) as unknown as SimpleBucket[]; // Issue with lodash typings: https://stackoverflow.com/questions/44467778
			}
		});
		return simpleAggs;
	}
}
