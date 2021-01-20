import { get } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import DataService from '../data/data.service';

import QueryBuilder from './queryBuilder';
import { GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID } from './search.gql';
import SearchService from './search.service';

checkRequiredEnvs([
	'ELASTICSEARCH_INDEX',
	'ELASTICSEARCH_INDEX_ITEMS',
	'ELASTICSEARCH_INDEX_COLLECTIONS',
]);

const ES_INDEX_MAP: { [key in Avo.Search.EsIndex]: string | undefined } = {
	all: process.env.ELASTICSEARCH_INDEX,
	items: process.env.ELASTICSEARCH_INDEX_ITEMS,
	collections: process.env.ELASTICSEARCH_INDEX_COLLECTIONS,
	bundles: process.env.ELASTICSEARCH_INDEX_BUNDLES,
};

export default class SearchController {
	public static async search(searchRequest: Avo.Search.Request): Promise<Avo.Search.Search> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = QueryBuilder.buildSearchObject(searchRequest);

			// Perform search
			return await SearchService.search(
				esQueryObject,
				ES_INDEX_MAP[searchRequest.index] || process.env.ELASTICSEARCH_INDEX
			);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new InternalServerError(
					'Failed to do search, are you connected to the elasticsearch VPN?',
					err,
					{ ...searchRequest }
				); // TODO remove dev error
			} else {
				throw new InternalServerError('Failed to do search', err, { ...searchRequest });
			}
		}
	}

	public static async getRelatedItems(
		id: string,
		type: Avo.Search.EsIndex,
		limit: number = 5
	): Promise<Avo.Search.Search> {
		try {
			// For private collections we need pass the title and description to elasticsearch since elasticsearch doesn't contain these collections
			// So we need to get the collection from graphql first so we can see if the collection has: is_public === false
			let privateCollection: Avo.Collection.Collection | undefined;
			if (type === 'collections' || type === 'bundles') {
				const response = await DataService.execute(
					GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID,
					{ id }
				);
				const collection = get(response, 'data.app_collections[0]');
				if (!collection) {
					throw new BadRequestError('Response does not contain any collections', null, {
						response,
					});
				}
				if (!collection.is_public) {
					privateCollection = collection;
				}
			}

			let likeFilter: any;
			if (privateCollection) {
				likeFilter = {
					_index: ES_INDEX_MAP[type],
					doc: {
						dc_title: privateCollection.title,
						dcterms_abstract: privateCollection.description,
					},
				};
			} else {
				likeFilter = {
					_index: ES_INDEX_MAP[type],
					_id: id,
				};
			}

			const esQueryObject = {
				size: limit,
				from: 0,
				query: {
					more_like_this: {
						fields: ['dc_title', 'dcterms_abstract'],
						like: [likeFilter],
						min_term_freq: 1,
						max_query_terms: 12,
					},
				},
			};

			// Perform search
			return await SearchService.search(esQueryObject, process.env.ELASTICSEARCH_INDEX);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new InternalServerError(
					'Failed to do search, are you connected to the elasticsearch VPN?',
					err,
					{ type, limit, itemId: id }
				);
			} else {
				throw new InternalServerError('Failed to do search', err, {
					type,
					limit,
					itemId: id,
				});
			}
		}
	}
}
