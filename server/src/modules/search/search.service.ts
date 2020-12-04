import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import { ELASTIC_TO_READABLE_FILTER_NAMES } from './search.consts';
import {
	AggregationMultiBucket,
	Aggregations,
	AggregationSingleBucket,
	Bucket,
	ElasticsearchResponse,
	SimpleBucket,
} from './search.types';

checkRequiredEnvs(['ELASTICSEARCH_URL']);

export default class SearchService {
	public static async search(searchQueryObject: any, index: string): Promise<Avo.Search.Search> {
		let url;
		if (!process.env.ELASTICSEARCH_URL) {
			throw new InternalServerError('Environment variable ELASTICSEARCH_URL is undefined');
		}
		try {
			const searchPath = process.env.ELASTICSEARCH_PATH || '_search';
			url = process.env.ELASTICSEARCH_URL;

			// TODO remove once ELASTICSEARCH_PATH env var has been added
			url = url.replace(/\/_search/, '');
			url = url.replace(/\/avo-search/, '');

			url = `${url}/${index}/${searchPath}`; // TODO remove default once ELASTICSEARCH_SEARCH_PATH env var has been added

			const esResponse: AxiosResponse<ElasticsearchResponse> = await axios({
				url,
				method: 'post',
				data: searchQueryObject,
			});

			// Handle response
			if (esResponse.status >= 200 && esResponse.status < 400) {
				let data = {};

				if (searchQueryObject.size !== 0) {
					data = {
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
					};
				}

				data = {
					...data,
					aggregations: SearchService.simplifyAggregations(
						_.get(esResponse, 'data.aggregations')
					),
				};

				return data as any;
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
