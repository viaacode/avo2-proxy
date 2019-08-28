import {Avo} from '@viaa/avo2-types';
import SearchService from './service';
import QueryBuilder from './queryBuilder';
import { CustomError } from '@shared/helpers/error';
// import { EsIndex } from '@viaa/avo2-types/types/search/types';

export type EsIndex = 'both' | 'items' | 'collections'; // TODO replace with @viaa/avo2-types/types/search/types when build is fixed

const ES_INDEX_MAP: {[key in EsIndex]: string | undefined} = {
	both: 'avo_qas*',
	items: undefined, // items is the default index that is searched
	collections: 'avo_qas_collections-*',
};

export default class SearchController {

	public static async search(searchRequest: Avo.Search.Request): Promise<Avo.Search.Response> {
		try {
			// Convert filters to ElasticSearch query object using queryBuilder
			const esQueryObject = QueryBuilder.buildSearchObject(searchRequest);

			// Perform search
			// tslint:disable-next-line:no-console
			console.log('----------\nquery: ', JSON.stringify(esQueryObject));
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
}
