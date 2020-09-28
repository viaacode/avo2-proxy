import * as promiseUtils from 'blend-promise-utils';
import { Request } from 'express';
import _ from 'lodash';

import type { Avo } from '@viaa/avo2-types';
import { SearchResultItem } from '@viaa/avo2-types/types/search/index';

import { CustomError, ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { getUserGroupIds } from '../auth/helpers/get-user-group-ids';
import DataService from '../data/service';
import OrganisationService from '../organization/service';
import PlayerTicketController from '../player-ticket/controller';
import PlayerTicketRoute from '../player-ticket/route';

import { DEFAULT_AUDIO_STILL, MEDIA_PLAYER_BLOCKS } from './consts';
import ContentPageService from './service';
import { ContentPageOverviewResponse, ResolvedItemOrCollection } from './types';

export type MediaItemResponse = Partial<Avo.Collection.Collection | Avo.Item.Item> & {
	count: number;
};

export default class ContentPageController {
	public static async getContentPageByPath(
		path: string,
		user: Avo.User.User | null,
		request: Request | null
	): Promise<Avo.ContentPage.Page | null> {
		try {
			const contentPage:
				| Avo.ContentPage.Page
				| undefined = await ContentPageService.getContentPageByPath(path);

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
			if (!_.intersection(contentPage.user_group_ids, getUserGroupIds(user)).length) {
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

	public static async getContentPagesForOverview(
		withBlock: boolean,
		contentType: string,
		labelIds: number[],
		selectedLabelIds: number[],
		orderByProp: string,
		orderByDirection: 'asc' | 'desc',
		offset: number,
		limit: number,
		user: Avo.User.User
	): Promise<ContentPageOverviewResponse> {
		return ContentPageService.fetchContentPages(
			withBlock,
			getUserGroupIds(user),
			contentType,
			labelIds,
			selectedLabelIds,
			orderByProp,
			orderByDirection,
			offset,
			limit
		);
	}

	private static async resolveMediaTileItemsInPage(
		contentPage: Avo.ContentPage.Page,
		request: Request
	) {
		const mediaGridBlocks = contentPage.contentBlockssBycontentId.filter(
			(contentBlock) => contentBlock.content_block_type === 'MEDIA_GRID'
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

					const results: any[] = await ContentPageController.resolveMediaTileItems(
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
		const mediaPlayerBlocks = contentPage.contentBlockssBycontentId.filter((contentBlock) =>
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
						].forEach((props) => {
							if (
								itemInfo &&
								(itemInfo as any)[props[0]] &&
								!_.get(mediaPlayerBlock, (blockInfo as any)[props[1]])
							) {
								if (
									props[0] === 'thumbnail_path' &&
									itemInfo.type.label === 'audio'
								) {
									// Replace poster for audio items with default still
									_.set(
										mediaPlayerBlock,
										(blockInfo as any)[props[1]],
										DEFAULT_AUDIO_STILL
									);
								} else {
									_.set(
										mediaPlayerBlock,
										(blockInfo as any)[props[1]],
										(itemInfo as any)[props[0]]
									);
								}
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
			let manualResults: any[] = [];
			let searchResults: any[] = [];

			// Check for items/collections
			const nonEmptyMediaItems = mediaItems.filter((mediaItem) => !_.isEmpty(mediaItem));
			if (nonEmptyMediaItems.length) {
				manualResults = await promiseUtils.mapLimit(
					nonEmptyMediaItems,
					10,
					async (itemInfo: {
						mediaItem: {
							type: 'ITEM' | 'COLLECTION' | 'BUNDLE';
							value: string;
						};
					}) => {
						const result: MediaItemResponse | null = await ContentPageService.fetchCollectionOrItem(
							itemInfo.mediaItem.type === 'BUNDLE'
								? 'COLLECTION'
								: itemInfo.mediaItem.type,
							itemInfo.mediaItem.value
						);
						if (result) {
							// Replace audio thumbnail
							if (_.get(result, 'type.label') === 'audio') {
								result.thumbnail_path = DEFAULT_AUDIO_STILL;
							}

							// Set video play url
							if ((result as any).browse_path) {
								(result as any).src = await this.getPlayableUrlByBrowsePathSilent(
									(result as any).browse_path,
									request
								);
								delete (result as any).browse_path; // Do not expose browse_path to the world
							}
						}
						return result;
					}
				);
			}

			// Check for search queries
			if (searchQuery) {
				// resolve search query to a list of results
				const parsedSearchQuery = JSON.parse(searchQuery);
				let searchQueryLimitNum: number = parseInt(searchQueryLimit, 10);
				if (_.isNaN(searchQueryLimitNum)) {
					searchQueryLimitNum = 8;
				}
				const searchResponse = await ContentPageService.fetchSearchQuery(
					searchQueryLimitNum - manualResults.length, // Fetch less search results if the user already specified some manual results
					parsedSearchQuery.filters || {},
					parsedSearchQuery.orderProperty || 'relevance',
					parsedSearchQuery.orderDirection || 'desc'
				);
				searchResults = await promiseUtils.mapLimit(
					searchResponse.results || [],
					8,
					(result) =>
						ContentPageController.mapSearchResultToItemOrCollection(result, request)
				);
			}

			return [...manualResults, ...searchResults];
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
		const isAudio = searchResult.administrative_type === 'audio';

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
				thumbnail_path: isAudio ? DEFAULT_AUDIO_STILL : searchResult.thumbnail_path,
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
			if (isItem) {
				item.src = await this.getPlayableUrlByExternalIdSilent(
					searchResult.external_id,
					request
				);
			}
			try {
				// TODO cache logos for quicker access
				const org = await OrganisationService.fetchOrganization(
					searchResult.original_cp_id
				);
				item.organisation.logo_url = _.get(org, 'logo_url') || null;
			} catch (err) {
				logger.error(
					new CustomError('Failed to set organization logo_url for item', err, {
						external_id: searchResult.external_id,
						original_cp_id: searchResult.original_cp_id,
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
			} as Avo.Core.MediaType,
			collection_fragments_aggregate: {
				aggregate: {
					count: (searchResult as any).fragment_count || 0, // TODO add to typings repo after completion of: https://meemoo.atlassian.net/browse/AVO-1107
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

	private static async getPlayableUrlByExternalIdSilent(
		externalId: string,
		request: Request
	): Promise<string | null> {
		try {
			return (
				(await PlayerTicketController.getPlayableUrl(
					externalId,
					await PlayerTicketRoute.getIp(request),
					request.header('Referer') || 'http://localhost:8080/',
					8 * 60 * 60 * 1000
				)) || null
			);
		} catch (err) {
			logger.error(
				new CustomError('Failed to get playable url for item', err, {
					externalId,
				})
			);
			return null;
		}
	}

	private static async getPlayableUrlByBrowsePathSilent(
		browsePath: string,
		request: Request
	): Promise<string | null> {
		try {
			return (
				(await PlayerTicketController.getPlayableUrlFromBrowsePath(
					browsePath,
					await PlayerTicketRoute.getIp(request),
					request.header('Referer') || 'http://localhost:8080/',
					8 * 60 * 60 * 1000
				)) || null
			);
		} catch (err) {
			logger.error(
				new CustomError('Failed to get playable url for item', err, {
					browsePath,
				})
			);
			return null;
		}
	}

	static async updatePublishDates() {
		return ContentPageService.updatePublishDates();
	}
}
