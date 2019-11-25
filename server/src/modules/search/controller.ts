import { Avo } from '@viaa/avo2-types';
import SearchService from './service';
import QueryBuilder from './queryBuilder';
import { CustomError } from '../../shared/helpers/error';
import DataService from '../data/service';
import { GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID } from './queries.gql';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import _ from 'lodash';

export type EsIndex = 'both' | 'items' | 'collections'; // TODO replace with @viaa/avo2-types/types/search/types when build is fixed

const ES_INDEX_MAP: { [key in EsIndex]: string | undefined } = {
	both: process.env.ELASTICSEARCH_INDEX,
	items: process.env.ELASTICSEARCH_INDEX_ITEMS,
	collections: process.env.ELASTICSEARCH_INDEX_COLLECTIONS,
};

export default class SearchController {

	public static async search(searchRequest: Avo.Search.Request): Promise<Avo.Search.Search> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = QueryBuilder.buildSearchObject(searchRequest);

			// Perform search
			return await SearchService.search(esQueryObject, ES_INDEX_MAP[searchRequest.index || 'both']); // TODO remove any when typings build is fixed
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new CustomError(
					'Failed to do search, are you connected to the elasticsearch VPN?',
					err,
					{ ...searchRequest }); // TODO remove dev error
			} else {
				throw new CustomError(
					'Failed to do search',
					err,
					{ ...searchRequest });
			}
		}
	}

	public static async getRelatedItems(itemId: string, index: EsIndex, limit: number = 5): Promise<Avo.Search.Search> {
		try {
			// For private collections we need pass the title and description to elasticsearch since elasticsearch doesn't contain these collections
			// So we need to get the collection from graphql first so we can see if the collection has: is_public === false
			let privateCollection: Avo.Collection.Collection | undefined;
			if (index === 'collections') {
				const response = await DataService.execute(GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID, { collectionId: itemId });
				const collection = _.get(response, 'data.app_collections[0]');
				if (!collection) {
					throw new BadRequestError(`Failed to get collection by id: ${itemId}`);
				}
				if (!collection.is_public) {
					privateCollection = collection;
				}
			}

			let likeFilter: any;
			if (privateCollection) {
				likeFilter = {
					_index: ES_INDEX_MAP[index],
					doc: {
						dc_title: privateCollection.title,
						dcterms_abstract: privateCollection.description,
					},
				};
			} else {
				likeFilter = {
					_index: ES_INDEX_MAP[index],
					_id: itemId,
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
			return await SearchService.search(esQueryObject, ES_INDEX_MAP[index || 'items']);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new CustomError(
					'Failed to do search, are you connected to the elasticsearch VPN?',
					err,
					{ itemId, index, limit });
			} else {
				throw new CustomError(
					'Failed to do search',
					err,
					{ itemId, index, limit });
			}
		}
	}
}
