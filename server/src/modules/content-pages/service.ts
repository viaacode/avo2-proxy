import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError } from '../../shared/helpers/error';
import DataService from '../data/service';
import SearchController from '../search/controller';

import { MediaItemResponse } from './controller';
import {
	GET_COLLECTION_TILE_BY_ID,
	GET_CONTENT_PAGE_BY_PATH,
	GET_ITEM_BY_EXTERNAL_ID,
	GET_ITEM_TILE_BY_ID,
} from './queries.gql';

export default class ContentPageService {
	public static async getContentBlockByPath(path: string): Promise<Avo.ContentPage.Page | null> {
		try {
			const response = await DataService.execute(GET_CONTENT_PAGE_BY_PATH, {
				path,
			});
			const contentPage: Avo.ContentPage.Page | undefined = _.get(
				response,
				'data.app_content[0]'
			);

			return contentPage || null;
		} catch (err) {
			throw new ExternalServerError('Failed to get content page', err);
		}
	}

	public static async fetchCollectionOrItem(
		type: 'ITEM' | 'COLLECTION',
		id: string
	): Promise<MediaItemResponse | null> {
		try {
			const response = await DataService.execute(
				type === 'ITEM' ? GET_ITEM_TILE_BY_ID : GET_COLLECTION_TILE_BY_ID,
				{ id }
			);

			const itemOrCollection = _.get(response, 'data.obj[0]', null);
			if (itemOrCollection) {
				itemOrCollection.count =
					_.get(response, 'data.view_counts_aggregate.aggregate.sum.count') || 0;
			}

			return itemOrCollection;
		} catch (err) {
			throw new CustomError('Failed to fetch collection or item', err, { type, id });
		}
	}

	public static async fetchItemByExternalId(
		externalId: string
	): Promise<Partial<Avo.Item.Item> | null> {
		try {
			const response = await DataService.execute(GET_ITEM_BY_EXTERNAL_ID, { externalId });

			return _.get(response, 'data.app_item_meta[0]', null);
		} catch (err) {
			throw new CustomError('Failed to fetch item by external id', err, { externalId });
		}
	}

	public static async fetchSearchQuery(
		limit: number,
		filters: Partial<Avo.Search.Filters>,
		orderProperty: Avo.Search.OrderProperty,
		orderDirection: Avo.Search.OrderDirection
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
			throw new CustomError('Failed to fetch search results for content page', err, {
				limit,
				filters,
			});
		}
	}
}
