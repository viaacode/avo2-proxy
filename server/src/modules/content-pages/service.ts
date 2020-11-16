import { fromPairs, get } from 'lodash';
import moment from 'moment';

import type { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { SpecialPermissionGroups } from '../auth/types';
import DataService from '../data/data.service';
import SearchController from '../search/controller';

import { MediaItemResponse } from './controller';
import {
	GET_COLLECTION_TILE_BY_ID,
	GET_CONTENT_PAGE_BY_PATH,
	GET_CONTENT_PAGES,
	GET_CONTENT_PAGES_WITH_BLOCKS,
	GET_ITEM_BY_EXTERNAL_ID,
	GET_ITEM_TILE_BY_ID,
	GET_PUBLIC_CONTENT_PAGES,
	UPDATE_CONTENT_PAGE_PUBLISH_DATES,
} from './queries.gql';
import { ContentPageOverviewResponse } from './types';

export default class ContentPageService {
	public static async getContentPageByPath(path: string): Promise<Avo.ContentPage.Page | null> {
		try {
			const response = await DataService.execute(GET_CONTENT_PAGE_BY_PATH, {
				path,
			});
			const contentPage: Avo.ContentPage.Page | undefined = get(
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

			const itemOrCollection = get(response, 'data.obj[0]', null);
			if (itemOrCollection) {
				itemOrCollection.count =
					get(response, 'data.view_counts_aggregate.aggregate.sum.count') || 0;
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

			return get(response, 'data.app_item_meta[0]', null);
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

	private static getLabelFilter(labelIds: number[]): any[] {
		if (labelIds.length) {
			// The user selected some block labels at the top of the page overview component
			return [
				{
					content_content_labels: {
						content_label: { id: { _in: labelIds } },
					},
				},
			];
		}
		return [];
	}

	public static async fetchContentPages(
		withBlock: boolean,
		userGroupIds: number[],
		contentType: string,
		labelIds: number[],
		selectedLabelIds: number[],
		orderByProp: string,
		orderByDirection: 'asc' | 'desc',
		offset: number,
		limit: number
	): Promise<ContentPageOverviewResponse> {
		const now = new Date().toISOString();
		const variables = {
			offset,
			limit,
			labelIds,
			where: {
				_and: [
					{
						// Get content pages with the selected content type
						content_type: { _eq: contentType },
					},
					{
						// Get pages that are visible to the current user
						_or: userGroupIds.map((userGroupId) => ({
							user_group_ids: { _contains: userGroupId },
						})),
					},
					...this.getLabelFilter(selectedLabelIds),
					// publish state
					{
						_or: [
							{ is_public: { _eq: true } },
							{ publish_at: { _eq: null }, depublish_at: { _gte: now } },
							{ publish_at: { _lte: now }, depublish_at: { _eq: null } },
							{ publish_at: { _lte: now }, depublish_at: { _gte: now } },
						],
					},
				],
			},
			orderBy: { [orderByProp]: orderByDirection },
			orUserGroupIds: userGroupIds.map((userGroupId) => ({
				content: { user_group_ids: { _contains: userGroupId } },
			})),
		};
		const response = await DataService.execute(
			withBlock ? GET_CONTENT_PAGES_WITH_BLOCKS : GET_CONTENT_PAGES,
			variables
		);
		if (response.errors) {
			throw new InternalServerError('GraphQL has errors', null, { response });
		}
		return {
			pages: get(response, 'data.app_content') || [],
			count: get(response, 'data.app_content_aggregate.aggregate.count', 0),
			labelCounts: fromPairs(
				get(response, 'data.app_content_labels', []).map((labelInfo: any): [
					number,
					number
				] => [
					get(labelInfo, 'id'),
					get(labelInfo, 'content_content_labels_aggregate.aggregate.count'),
				])
			),
		};
	}

	public static async fetchPublicContentPages(): Promise<
		{
			path: string;
			updated_at: string;
		}[]
	> {
		try {
			const now = new Date().toISOString();
			const response = await DataService.execute(GET_PUBLIC_CONTENT_PAGES, {
				where: {
					_and: [
						{
							user_group_ids: { _contains: SpecialPermissionGroups.loggedOutUsers },
						},
						// publish state
						{
							_or: [
								{ is_public: { _eq: true } },
								{ publish_at: { _eq: null }, depublish_at: { _gte: now } },
								{ publish_at: { _lte: now }, depublish_at: { _eq: null } },
								{ publish_at: { _lte: now }, depublish_at: { _gte: now } },
							],
						},
					],
				},
			});
			if (response.errors) {
				throw new InternalServerError('GraphQL has errors', null, { response });
			}
			return get(response, 'data.app_content') || [];
		} catch (err) {
			throw new InternalServerError('Failed to fetch all public content pages');
		}
	}

	static async updatePublishDates(): Promise<{ published: number; unpublished: number }> {
		try {
			const response = await DataService.execute(UPDATE_CONTENT_PAGE_PUBLISH_DATES, {
				now: new Date().toISOString(),
				publishedAt: moment().hours(7).minutes(0).toISOString(),
			});
			if (response.errors) {
				throw new InternalServerError('Graphql mutation returned errors', response);
			}
			return {
				published: get(response, 'data.publish_content_pages.affected_rows', 0),
				unpublished: get(response, 'data.unpublish_content_pages.affected_rows', 0),
			};
		} catch (err) {
			throw new InternalServerError('Failed to update content page publish dates', err);
		}
	}
}
