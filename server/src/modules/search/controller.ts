import { Avo } from '@viaa/avo2-types';
import SearchService from './service';
import QueryBuilder from './queryBuilder';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
// import { EsIndex } from '@viaa/avo2-types/types/search/types';

export type EsIndex = 'both' | 'items' | 'collections'; // TODO replace with @viaa/avo2-types/types/search/types when build is fixed

const ES_INDEX_MAP: { [key in EsIndex]: string | undefined } = {
	both: 'avo_*',
	items: 'avo_items',
	collections: 'avo_collections',
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
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = {
				size: limit,
				from: 0,
				query: {
					more_like_this : {
						fields : ['dc_title', 'dcterms_abstract'],
						like : [
							{
								_index : ES_INDEX_MAP[index],
								_id : itemId,
							},
						],
						min_term_freq : 1,
						max_query_terms : 12,
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
