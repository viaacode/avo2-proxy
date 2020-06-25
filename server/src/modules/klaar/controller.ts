import _ from 'lodash';
import moment from 'moment';
import * as queryString from 'querystring';

import { Avo } from '@viaa/avo2-types';

import { CustomError, ExternalServerError, NotFoundError } from '../../shared/helpers/error';
import ContentPageController from '../content-pages/controller';
import DataService from '../data/service';

import { GET_ITEM_THUMBNAIL_BY_EXTERNAL_ID } from './klaar.gql';

interface KlaarNewsletterItem {
	title: string;
	description: string;
	still: string;
	link: string;
}

interface KlaarNewsletter {
	uuid: string;
	timestamp: string;
	published: boolean;
	message: {
		subject: string;
		body: any;
		avo_link: string;
		assets: KlaarNewsletterItem[];
	};
}

export interface ButtonAction {
	type: string;
	value: string;
}

interface MediaPlayerTitleTextButtonBlock {
	variables: {
		blockState: {
			backgroundColor: string;
		};
		componentState: {
			align: string;
			content: string;
			mediaItem: {
				type: string;
				value: string;
			};
			buttonType: string;
			mediaTitle: string;
			buttonLabel: string;
			headingType: string;
			buttonAction: ButtonAction;
			headingTitle: string;
		};
	};
	content_block_type: string;
	content_id: number;
}

interface KlaarBlock {
	variables: {
		blockState: {
			date: string;
		};
		componentState: {
			title: string;
		}[];
	};
	content_block_type: string;
	content_id: number;
}

export default class KlaarController {
	/**
	 * Get json for klaar newsletter by converting contentpage with path /klaar into into a fixed json format
	 */
	public static async getKlaarJson(): Promise<KlaarNewsletter> {
		try {
			const klaarNewsLetterContentPage = await ContentPageController.getContentPageByPath(process.env.KLAAR_NEWSLETTER_CONTENT_PAGE_PATH, null, null);
			if (!klaarNewsLetterContentPage) {
				throw new NotFoundError(
					'Failed to find klaar newsletter content page by path',
					null,
					{
						envVarName: 'KLAAR_NEWSLETTER_CONTENT_PAGE_PATH',
						envVarValue: process.env.KLAAR_NEWSLETTER_CONTENT_PAGE_PATH,
					});
			}
			const subjectAndDate = this.extractKlaarSubjectAndDate(klaarNewsLetterContentPage);
			return {
				// Avoid issues with different timezones in the ibm server
				// eg: 21/04/2020 Belgium time is 20/04/2020 22:00:00 UTC time
				// By adding 12 hours we always extract the correct date that was intended
				uuid: moment(subjectAndDate.date).add(12, 'hours').format('YYYYMMDD'),
				timestamp: klaarNewsLetterContentPage.updated_at,
				message: {
					subject: subjectAndDate.subject || klaarNewsLetterContentPage.title,
					body: klaarNewsLetterContentPage.description,
					avo_link: `${process.env.CLIENT_HOST}/klaar`,
					assets: await KlaarController.extractMediaItems(klaarNewsLetterContentPage),
				},
				published: true,
			};
		} catch (err) {
			throw new ExternalServerError(
				'Failed to generate klaar json from newsletter content page',
				err,
				{
					newsletterPath: process.env.KLAAR_NEWSLETTER_CONTENT_PAGE_PATH,
				}
			);
		}
	}

	private static extractKlaarSubjectAndDate(contentPage: Avo.ContentPage.Page): { date: string, subject: string } {
		const klaarBlocks: KlaarBlock[] = contentPage.contentBlockssBycontentId.filter(block =>
			block.content_block_type === 'KLAAR'
		) as unknown as KlaarBlock[];
		if (!klaarBlocks.length) {
			throw new CustomError('Failed to find klaar block on klaar page. This block is needed for the json date and subject', null, contentPage);
		}
		return {
			subject: (_.get(klaarBlocks, '[0].variables.componentState.titles') || []).join(' • '),
			date: _.get(klaarBlocks, '[0].variables.componentState.date'),
		};
	}

	/**
	 * Convert each block of type MEDIA_PLAYER_TITLE_TEXT_BUTTON to the correct json object for the klaar json
	 * @param contentPage
	 */
	private static async extractMediaItems(contentPage: Avo.ContentPage.Page): Promise<KlaarNewsletterItem[]> {
		try {
			const itemBlocks: MediaPlayerTitleTextButtonBlock[] = contentPage.contentBlockssBycontentId.filter(block =>
				block.content_block_type === 'MEDIA_PLAYER_TITLE_TEXT_BUTTON'
			) as unknown as MediaPlayerTitleTextButtonBlock[];
			const externalIds = _.compact(itemBlocks.map(item => _.get(item, 'variables.componentState.mediaItem.value')));
			const thumbnails = await this.getItemThumbnails(externalIds);
			return itemBlocks.map((item): KlaarNewsletterItem => {
				return {
					title: item.variables.componentState.headingTitle,
					description: item.variables.componentState.content,
					link: KlaarController.buttonActionToUrl(item.variables.componentState.mediaItem),
					still: thumbnails[item.variables.componentState.mediaItem.value],
				};
			});
		} catch (err) {
			throw new CustomError('Failed to extract media items from klaar newsletter content page', err, { contentPage });
		}
	}

	private static buttonActionToUrl(action: ButtonAction): string {
		if (action) {
			const { type, value } = action;

			switch (type) {
				case 'INTERNAL_LINK':
				case 'CONTENT_PAGE':
					return process.env.CLIENT_HOST + value as string;

				case 'COLLECTION':
					return `${process.env.CLIENT_HOST}/collections/${value}`;

				case 'ITEM':
					return `${process.env.CLIENT_HOST}/items/${value}`;

				case 'BUNDLE':
					return `${process.env.CLIENT_HOST}/bundels/${value}`;

				case 'EXTERNAL_LINK':
					return value as string;

				default:
					return `${process.env.CLIENT_HOST}/error?${queryString.stringify({
						message: 'Dit klaar item kon niet worden gevonden',
						icon: 'search',
						actionButtons: ['home', 'helpdesk'],
					})}`;
			}
		}
	}

	private static async getItemThumbnails(externalIds: string[]): Promise<{ [externalId: string]: string }> {
		try {
			const response = await DataService.execute(GET_ITEM_THUMBNAIL_BY_EXTERNAL_ID, { externalIds });
			if (response.errors) {
				throw new CustomError('Graphql response contains errors', null, { response });
			}
			return _.fromPairs(
				_.get(response, 'data.app_item_meta', [])
					.map((item: any) => [item.external_id, item.thumbnail_path])
			);
		} catch (err) {
			throw new CustomError('Failed to get item thumbnails by external ids', err, { externalIds });
		}
	}
}
