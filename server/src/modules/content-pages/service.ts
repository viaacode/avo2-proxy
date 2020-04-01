import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError } from '../../shared/helpers/error';

import DataService from '../data/service';
import { GET_COLLECTION_TILE_BY_ID, GET_CONTENT_PAGE_BY_PATH, GET_ITEM_TILE_BY_ID } from './queries.gql';
import { MediaItemResponse } from './controller';
import SearchController from '../search/controller';

export default class ContentPageService {
	public static async getContentBlockByPath(path: string): Promise<Avo.Content.Content | null> {
		try {
			const response = await DataService.execute(GET_CONTENT_PAGE_BY_PATH, {
				path,
			});
			const contentPage: Avo.Content.Content | undefined = _.get(response, 'data.app_content[0]');

			return contentPage || null;
		} catch (err) {
			throw new ExternalServerError('Failed to get content page', err);
		}
	}

	public static async fetchCollectionOrItem(type: 'ITEM' | 'COLLECTION', id: string): Promise<MediaItemResponse | null> {
		try {
			const response = await DataService.execute(type === 'ITEM' ? GET_ITEM_TILE_BY_ID : GET_COLLECTION_TILE_BY_ID, { id });

			const itemOrCollection = _.get(response, 'data.obj[0]', null);
			// const count = _.get(response, 'data.count[0]', 0); // TODO fix counts

			return itemOrCollection;
		} catch (err) {
			throw new CustomError('Failed to fetch collection or item', err, { type, id });
		}
	}

	public static async fetchSearchQuery(
		limit: number,
		filters: Partial<Avo.Search.Filters>,
		orderProperty: Avo.Search.OrderProperty,
		orderDirection: Avo.Search.OrderDirection,
	): Promise<Avo.Search.Search | null> {
		try {
			return await SearchController.search({
				filters,
				orderProperty,
				orderDirection,
				from: 0,
				size: limit,
				index: 'all' as Avo.Search.EsIndex,
			});
		} catch (err) {
			throw new CustomError('Failed to fetch search results for content page', err, { limit, filters });
		}
	}
}
