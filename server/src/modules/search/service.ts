import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import { ELASTIC_TO_READABLE_FILTER_NAMES } from './constants';

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

type Aggregations = {
	[prop: string]: AggregationMultiBucket | AggregationSingleBucket;
};

type AggregationMultiBucket = {
	buckets: {
		[bucketName: string]: {
			from?: number;
			to?: number;
			doc_count: number;
		};
	};
};

type Bucket = { key: string; doc_count: number };

type AggregationSingleBucket = {
	doc_count_error_upper_bound: number;
	sum_other_doc_count: number;
	buckets: Bucket[];
};

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
		let data: { username: string; password: string } | undefined;
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
			throw new InternalServerError('Failed to get JWT token from auth server', err, {
				url,
				data,
			});
		}
	}

	private static async getAuthToken(): Promise<string> {
		try {
			if (SearchService.tokenPromise) {
				// Token call in progress, return the same promise that is in progress
				return SearchService.tokenPromise;
			}

			if (!SearchService.authToken || SearchService.authTokenExpire < new Date()) {
				// We need to get a token the first time the search api is called or
				// when the token in the cache is expired
				SearchService.tokenPromise = SearchService.getAuthTokenFromNetwork();
				SearchService.authToken = await SearchService.tokenPromise;
				SearchService.authTokenExpire = new Date(new Date().getTime() + 5 * 60 * 1000); // Refresh token every 5 min
				SearchService.tokenPromise = null;
				return SearchService.authToken;
			}
			// Return cached token
			return SearchService.authToken;
		} catch (err) {
			SearchService.tokenPromise = null;
			throw new ExternalServerError('Failed to get token for elasticsearch', err);
		}
	}

	public static async search(searchQueryObject: any, index: string): Promise<Avo.Search.Search> {
		let url;
		if (!process.env.ELASTICSEARCH_URL) {
			throw new InternalServerError('Environment variable ELASTICSEARCH_URL is undefined');
		}
		try {
			url = process.env.ELASTICSEARCH_URL;
			url = url.replace('/avo-search/', `/avo-search/${index}/`);

			let token: string;
			try {
				token = await SearchService.getAuthToken();
			} catch (err) {
				logger.error(
					new ExternalServerError('Failed to get token for elasticsearch, attempt 1', err)
				);
				try {
					token = await SearchService.getAuthToken();
				} catch (err) {
					throw new ExternalServerError(
						'Failed to get token for elasticsearch, attempt 2',
						err
					);
				}
			}

			logger.info(`---------- query:\n${url}\n${JSON.stringify(searchQueryObject)}`);
			const esResponse: AxiosResponse<ElasticsearchResponse> = await axios({
				url,
				method: 'post',
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
					results: _.map(
						_.get(esResponse, 'data.hits.hits'),
						(result): Avo.Search.ResultItem => {
							return {
								...result._source,
								id: result._source.external_id,
							} as Avo.Search.ResultItem;
						}
					),
					aggregations: this.simplifyAggregations(_.get(esResponse, 'data.aggregations')),
				};
			}
			throw new InternalServerError('Request to elasticsearch was unsuccessful', null, {
				url,
				searchQueryObject,
				method: 'post',
				status: esResponse.status,
				statusText: esResponse.statusText,
			});
		} catch (err) {
			throw new InternalServerError('Failed to make request to elasticsearch', err, {
				url,
				searchQueryObject,
				method: 'post',
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
	public static simplifyAggregations(aggregations: Aggregations): Avo.Search.FilterOptions {
		const simpleAggs: Avo.Search.FilterOptions = {};
		_.forEach(
			aggregations,
			(value: AggregationMultiBucket | AggregationSingleBucket, prop: string) => {
				const cleanProp = prop.replace(/\.filter$/, '');
				if (!ELASTIC_TO_READABLE_FILTER_NAMES[cleanProp]) {
					logger.error(`elasticsearch filter name not found for ${cleanProp}`);
				}
				if (_.isPlainObject(value.buckets)) {
					// range bucket object (eg: fragment_duration_seconds)
					const rangeBuckets = value.buckets as {
						[bucketName: string]: {
							from?: number;
							to?: number;
							doc_count: number;
						};
					};
					simpleAggs[ELASTIC_TO_READABLE_FILTER_NAMES[cleanProp]] = _.map(
						rangeBuckets,
						(bucketValue, bucketName): SimpleBucket => {
							return {
								option_name: bucketName,
								option_count: bucketValue.doc_count,
							};
						}
					) as SimpleBucket[]; // Issue with lodash typings: https://stackoverflow.com/questions/44467778
				} else {
					// regular bucket array (eg: administrative_type)
					const regularBuckets = value.buckets as Bucket[];
					simpleAggs[ELASTIC_TO_READABLE_FILTER_NAMES[cleanProp]] = _.map(
						regularBuckets,
						(bucketValue): SimpleBucket => {
							return {
								option_name: bucketValue.key,
								option_count: bucketValue.doc_count,
							};
						}
					) as SimpleBucket[]; // Issue with lodash typings: https://stackoverflow.com/questions/44467778
				}
			}
		);
		return simpleAggs;
	}
}
