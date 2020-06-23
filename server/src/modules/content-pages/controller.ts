import * as promiseUtils from 'blend-promise-utils';
import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';
import { SearchResultItem } from '@viaa/avo2-types/types/search/index';

import { CustomError, ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import PlayerTicketController from '../player-ticket/controller';
import PlayerTicketRoute from '../player-ticket/route';

import { MEDIA_PLAYER_BLOCKS } from './consts';
import ContentPageService from './service';
import { ResolvedItemOrCollection } from './types';

export enum SpecialPermissionGroups {
	loggedOutUsers = -1,
	loggedInUsers = -2,
}

export interface MediaItemResponse {
	// TODO move to typings repo
	tileData: Partial<Avo.Collection.Collection | Avo.Item.Item>;
	count: number;
}

export default class ContentPageController {
	public static async getContentPageByPath(
		path: string,
		user: Avo.User.User | null,
		request: Request | null
	): Promise<Avo.ContentPage.Page | null> {
		try {
			const contentPage:
				| Avo.ContentPage.Page
				| undefined = await ContentPageService.getContentBlockByPath(path);

			const permissions = _.get(user, 'profile.permissions', []);
			const profileId = _.get(user, 'profile.id', []);
			const canEditContentPage =
				permissions.includes('EDIT_ANY_CONTENT_PAGES') ||
				(permissions.includes('EDIT_OWN_CONTENT_PAGES') &&
					contentPage.user_profile_id === profileId);

			if (!contentPage) {
				return null;
			}

			// People that can edit the content page are not restricted by the publish_at, depublish_at, is_public settings
			if (!canEditContentPage) {
				if (
					contentPage.publish_at &&
					new Date().getTime() < new Date(contentPage.publish_at).getTime()
				) {
					return null; // Not yet published
				}

				if (
					contentPage.depublish_at &&
					new Date().getTime() > new Date(contentPage.depublish_at).getTime()
				) {
					return null; // Already depublished yet published
				}

				if (!contentPage.is_public) {
					return null;
				}
			}

			// Check if content page is accessible for the user who requested the content page
			if (
				!_.intersection(contentPage.user_group_ids, [
					..._.get(user, 'profile.userGroupIds', []),
					user
						? SpecialPermissionGroups.loggedInUsers
						: SpecialPermissionGroups.loggedOutUsers,
				]).length
			) {
				return null;
			}

			// Check if content page contains any search query content bocks (eg: media grids)
			await this.resolveMediaTileItemsInPage(contentPage, request);

			// Check if content page contains any media player content blocks (eg: mediaplayer, mediaPlayerTitleTextButton, hero)
			if (request) {
				await this.resolveMediaPlayersInPage(contentPage, request);
			}

			return contentPage;
		} catch (err) {
			throw new ExternalServerError('Failed to get content page', err);
		}
	}

	private static async resolveMediaTileItemsInPage(
		contentPage: Avo.ContentPage.Page,
		request: Request
	) {
		const mediaGridBlocks = contentPage.contentBlockssBycontentId.filter(
			contentBlock => contentBlock.content_block_type === 'MEDIA_GRID'
		);
		if (mediaGridBlocks.length) {
			await promiseUtils.mapLimit(mediaGridBlocks, 2, async (mediaGridBlock: any) => {
				try {
					const searchQuery = _.get(
						mediaGridBlock,
						'variables.blockState.searchQuery.value'
					);
					const searchQueryLimit = _.get(
						mediaGridBlock,
						'variables.blockState.searchQueryLimit'
					);
					const mediaItems = _.get(mediaGridBlock, 'variables.componentState', []).filter(
						(item: any) => item.mediaItem
					);

					const results: any[] = await this.resolveMediaTileItems(
						searchQuery,
						searchQueryLimit,
						mediaItems,
						request
					);

					_.set(mediaGridBlock, 'variables.blockState.results', results);
				} catch (err) {
					logger.error(
						new CustomError('Failed to resolve media grid content', err, {
							mediaGridBlocks,
							mediaGridBlock,
						})
					);
				}
			});
		}
	}

	private static async resolveMediaPlayersInPage(
		contentPage: Avo.ContentPage.Page,
		request: Request
	) {
		const mediaPlayerBlocks = contentPage.contentBlockssBycontentId.filter(contentBlock =>
			_.keys(MEDIA_PLAYER_BLOCKS).includes(contentBlock.content_block_type)
		);
		if (mediaPlayerBlocks.length) {
			await promiseUtils.mapLimit(mediaPlayerBlocks, 2, async (mediaPlayerBlock: any) => {
				try {
					const blockInfo = MEDIA_PLAYER_BLOCKS[mediaPlayerBlock.content_block_type];
					const externalId = _.get(mediaPlayerBlock, blockInfo.getItemExternalIdPath);
					if (externalId) {
						const itemInfo = await ContentPageService.fetchItemByExternalId(externalId);
						let videoSrc: string | undefined;
						if (itemInfo && itemInfo.browse_path) {
							videoSrc = await PlayerTicketController.getPlayableUrlFromBrowsePath(
								itemInfo.browse_path,
								await PlayerTicketRoute.getIp(request),
								request.header('Referer') || 'http://localhost:8080/',
								8 * 60 * 60 * 1000
							);
						}

						// Copy all required properties to be able to render the video player without having to use the data route to fetch item information
						if (videoSrc && !_.get(mediaPlayerBlock, blockInfo.setVideoSrcPath)) {
							_.set(mediaPlayerBlock, blockInfo.setVideoSrcPath, videoSrc);
						}
						[
							['thumbnail_path', 'setPosterSrcPath'],
							['title', 'setTitlePath'],
							['description', 'setDescriptionPath'],
							['issued', 'setIssuedPath'],
							['organisation', 'setOrganisationPath'],
						].forEach(props => {
							if (
								itemInfo &&
								(itemInfo as any)[props[0]] &&
								!_.get(mediaPlayerBlock, (blockInfo as any)[props[1]])
							) {
								_.set(
									mediaPlayerBlock,
									(blockInfo as any)[props[1]],
									(itemInfo as any)[props[0]]
								);
							}
						});
					}
				} catch (err) {
					logger.error(
						new CustomError('Failed to resolve media grid content', err, {
							mediaPlayerBlocks,
							mediaPlayerBlock,
						})
					);
				}
			});
		}
	}

	public static async resolveMediaTileItems(
		searchQuery: string | undefined,
		searchQueryLimit: string | undefined,
		mediaItems:
			| {
					mediaItem: {
						type: 'ITEM' | 'COLLECTION' | 'BUNDLE';
						value: string;
					};
			  }[]
			| undefined,
		request: Request
	): Promise<Partial<Avo.Item.Item | Avo.Collection.Collection>[]> {
		try {
			let results: any[] = [];
			// Check for search queries
			if (searchQuery) {
				// resolve search query to a list of results
				const parsedSearchQuery = JSON.parse(searchQuery);
				let searchQueryLimitNum: number = parseInt(searchQueryLimit, 10);
				if (_.isNaN(searchQueryLimitNum)) {
					searchQueryLimitNum = 8;
				}
				const searchResponse = await ContentPageService.fetchSearchQuery(
					searchQueryLimitNum,
					parsedSearchQuery.filters || {},
					parsedSearchQuery.orderProperty || 'relevance',
					parsedSearchQuery.orderDirection || 'desc'
				);
				results = await promiseUtils.mapLimit(searchResponse.results || [], 8, result =>
					ContentPageController.mapSearchResultToItemOrCollection(result, request)
				);
			}

			// Check for items/collections
			const nonEmptyMediaItems = mediaItems.filter(mediaItem => !_.isEmpty(mediaItem));
			if (nonEmptyMediaItems.length) {
				results = await promiseUtils.mapLimit(
					nonEmptyMediaItems,
					10,
					async (item: {
						mediaItem: {
							type: 'ITEM' | 'COLLECTION' | 'BUNDLE';
							value: string;
						};
					}) => {
						return await ContentPageService.fetchCollectionOrItem(
							item.mediaItem.type === 'BUNDLE' ? 'COLLECTION' : item.mediaItem.type,
							item.mediaItem.value
						);
					}
				);
			}

			return results;
		} catch (err) {
			throw new CustomError('Failed to resolve media grid content', err, {
				searchQuery,
				searchQueryLimit,
				mediaItems,
			});
		}
	}

	private static async mapSearchResultToItemOrCollection(
		searchResult: SearchResultItem,
		request: Request
	): Promise<ResolvedItemOrCollection> {
		const isItem =
			searchResult.administrative_type === 'video' ||
			searchResult.administrative_type === 'audio';

		if (isItem) {
			const item = {
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
						sum: {
							count: searchResult.views_count,
						},
					},
				},
			} as Partial<Avo.Item.Item> & { src?: string };
			try {
				item.src = isItem
					? (await PlayerTicketController.getPlayableUrl(
							searchResult.external_id,
							await PlayerTicketRoute.getIp(request),
							request.header('Referer') || 'http://localhost:8080/',
							8 * 60 * 60 * 1000
					  )) || null
					: null;
			} catch (err) {
				logger.error(
					new CustomError('Failed to set video source for item', err, {
						external_id: searchResult.external_id,
					})
				);
			}
			return item;
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
					sum: {
						count: searchResult.views_count,
					},
				},
			},
		} as Partial<Avo.Collection.Collection>;
	}
}
