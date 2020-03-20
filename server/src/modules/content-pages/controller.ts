import { Request } from 'express';
import _ from 'lodash';
import * as promiseUtils from 'blend-promise-utils';

import { Avo } from '@viaa/avo2-types';
import { SearchResultItem } from '@viaa/avo2-types/types/search/index';

import { logger } from '../../shared/helpers/logger';
import { CustomError, ExternalServerError } from '../../shared/helpers/error';
import { IdpHelper } from '../auth/idp-helper';

import ContentPageService from './service';

export enum SpecialPermissionGroups {
	loggedOutUsers = -1,
	loggedInUsers = -2,
}

export interface MediaItemResponse { // TODO move to typings repo
	tileData: Partial<Avo.Collection.Collection | Avo.Item.Item>;
	count: number;
}

export default class ContentPageController {
	public static async getContentBlockByPath(path: string, request: Request): Promise<Avo.Content.Content | null> {
		try {
			const user: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(request);
			const contentPage: Avo.Content.Content | undefined = await ContentPageService.getContentBlockByPath(path);

			if (!contentPage) {
				return null;
			}

			// Check if content page is accessible for the user who requested the content page
			if (!_.intersection(
				contentPage.user_group_ids,
				[
					..._.get(user, 'profile.userGroupIds', []),
					user ? SpecialPermissionGroups.loggedInUsers : SpecialPermissionGroups.loggedOutUsers,
				]
			).length) {
				return null;
			}

			// Check if content page contains any search query content bocks (eg: media grids)
			await this.resolveMediaTileItems(contentPage);

			return contentPage;
		} catch (err) {
			throw new ExternalServerError('Failed to get content page', err);
		}
	}

	private static async resolveMediaTileItems(contentPage: Avo.Content.Content) {
		const mediaGridBlocks = contentPage.contentBlockssBycontentId.filter(contentBlock =>
			contentBlock.content_block_type === 'MEDIA_GRID');

		if (mediaGridBlocks.length) {
			await promiseUtils.mapLimit(mediaGridBlocks, 2, async (mediaGridBlock: any) => {
				try {
					let results: any[] = [];
					// Check for search queries
					const searchQuery = _.get(mediaGridBlock, 'variables.blockState.searchQuery.value');
					const searchQueryLimit = _.get(mediaGridBlock, 'variables.blockState.searchQueryLimit');
					if (searchQuery) {
						// resolve search query to a list of results
						const parsedSearchQuery = JSON.parse(searchQuery);
						const searchResponse = await ContentPageService.fetchSearchQuery(
							searchQueryLimit,
							parsedSearchQuery.filters || {},
							parsedSearchQuery.orderProperty || 'relevance',
							parsedSearchQuery.orderDirection || 'desc');
						results = (searchResponse.results || []).map(ContentPageController.mapSearchResultToItemOrCollection);
					}

					// Check for items/collections
					const mediaItems = _.get(mediaGridBlock, 'variables.componentState');
					if (mediaItems.length && !_.isEmpty(mediaItems[0])) {
						results = await promiseUtils.mapLimit(mediaItems, 10, async (item: {
							mediaItem: {
								type: 'ITEM' | 'COLLECTION',
								value: string
							}
						}) => {
							return await ContentPageService.fetchCollectionOrItem(item.mediaItem.type, item.mediaItem.value);
						});
					}

					_.unset(mediaGridBlock, 'variables.componentState');
					_.unset(mediaGridBlock, 'variables.blockState.searchQuery.value');
					_.unset(mediaGridBlock, 'variables.blockState.searchQueryLimit');
					_.set(mediaGridBlock, 'variables.blockState.results', results);
				} catch (err) {
					logger.error(new CustomError(
						'Failed to resolve media grid content',
						err,
						{ contentPage, mediaGridBlock }
					));
				}
			});
		}
	}

	private static mapSearchResultToItemOrCollection(searchResult: SearchResultItem): Partial<Avo.Item.Item | Avo.Collection.Collection> {
		const isItem = searchResult.administrative_type === 'video' || searchResult.administrative_type === 'audio';

		if (isItem) {
			return {
				external_id: searchResult.external_id,
				title: searchResult.dc_title,
				created_at: searchResult.dcterms_issued,
				description: searchResult.dcterms_abstract,
				duration: searchResult.duration_time,
				lom_classification: searchResult.lom_classification,
				lom_context: searchResult.lom_context,
				lom_intended_enduser_role: searchResult.lom_intended_enduser_role,
				lom_keywords: searchResult.lom_keywords,
				lom_languages: searchResult.lom_languages,
				lom_typical_age_range: searchResult.lom_typical_age_range,
				issued: searchResult.dcterms_issued,
				thumbnail_path: searchResult.thumbnail_path,
				org_id: searchResult.original_cp_id,
				organisation: {
					name: searchResult.original_cp,
					or_id: searchResult.original_cp_id,
				} as Avo.Organization.Organization,
				series: searchResult.dc_titles_serie,
				type: {
					label: searchResult.administrative_type,
				} as any,
				view_counts_aggregate: {
					aggregate: {
						count: searchResult.views_count,
					},
				},
			} as Partial<Avo.Item.Item>;
		}
		return {
			id: searchResult.id,
			title: searchResult.dc_title,
			created_at: searchResult.dcterms_issued,
			description: searchResult.dcterms_abstract,
			duration: searchResult.duration_time,
			lom_classification: searchResult.lom_classification,
			lom_context: searchResult.lom_context,
			lom_intended_enduser_role: searchResult.lom_intended_enduser_role,
			lom_keywords: searchResult.lom_keywords,
			lom_languages: searchResult.lom_languages,
			lom_typical_age_range: searchResult.lom_typical_age_range,
			issued: searchResult.dcterms_issued,
			thumbnail_path: searchResult.thumbnail_path,
			org_id: searchResult.original_cp_id,
			organisation: {
				name: searchResult.original_cp,
				or_id: searchResult.original_cp_id,
			} as Avo.Organization.Organization,
			series: searchResult.dc_titles_serie,
			type: {
				label: searchResult.administrative_type,
			} as any, // TODO update to Avo.Core.MediaType after update to typings v2.14.0
			collection_fragments_aggregate: {
				aggregate: {
					count: 0, // TODO get value into elasticsearch
				},
			},
			view_counts_aggregate: {
				aggregate: {
					count: searchResult.views_count,
				},
			},
		} as Partial<Avo.Collection.Collection>;
	}
}
