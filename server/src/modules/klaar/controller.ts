import * as queryString from 'querystring';
import _ from 'lodash';
import moment from 'moment';

import { Avo } from '@viaa/avo2-types';

import DataService from '../data/service';
import { GET_KLAAR_NEWSLETTER_CONTENT_PAGE } from './queries.gql';
import { ExternalServerError, NotFoundError } from '../../shared/helpers/error';

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

export default class KlaarController {
	/**
	 * Get json for klaar newsletter by converting contentpage with path /klaar into into a fixed json format
	 */
	public static async getKlaarJson(): Promise<KlaarNewsletter> {
		try {
			const response = await DataService.execute(GET_KLAAR_NEWSLETTER_CONTENT_PAGE, {
				path: process.env.KLAAR_NEWSLETTER_CONTENT_PAGE_PATH,
			});
			const klaarNewsLetterContentPage: Avo.Content.Content | undefined = _.get(response, 'data.app_content[0]');
			if (!klaarNewsLetterContentPage) {
				throw new NotFoundError(
					'Failed to find klaar newsletter content page by path',
					null,
					{
						envVarName: 'KLAAR_NEWSLETTER_CONTENT_PAGE_PATH',
						envVarValue: process.env.KLAAR_NEWSLETTER_CONTENT_PAGE_PATH,
						query: GET_KLAAR_NEWSLETTER_CONTENT_PAGE,
					});
			}
			return {
				uuid: moment(klaarNewsLetterContentPage.updated_at).format('YYYYMMDD'),
				timestamp: klaarNewsLetterContentPage.updated_at,
				message: {
					subject: klaarNewsLetterContentPage.title,
					body: klaarNewsLetterContentPage.description,
					avo_link: `${process.env.CLIENT_HOST}/klaar`,
					assets: KlaarController.extractItems(klaarNewsLetterContentPage),
				},
				published: true,
			};
		} catch (err) {
			throw new ExternalServerError('Failed to get navigation items', err);
		}
	}

	private static extractItems(contentPage: Avo.Content.Content): KlaarNewsletterItem[] {
		const itemBlocks: MediaPlayerTitleTextButtonBlock[] = contentPage.contentBlockssBycontentId.filter(block =>
			block.content_block_type === 'MEDIA_PLAYER_TITLE_TEXT_BUTTON'
		) as unknown as MediaPlayerTitleTextButtonBlock[];
		return itemBlocks.map((item): KlaarNewsletterItem => {
			return {
				title: item.variables.componentState.headingTitle,
				description: item.variables.componentState.content,
				link: KlaarController.buttonActionToUrl(item.variables.componentState.buttonAction),
				// TODO waiting for MEDIA_PLAYER_TITLE_TEXT_BUTTON block to save thumbnail into component state of the block
				still: 'https://onderwijs-qas.hetarchief.be/images/100x100.svg',
			};
		});
	}

	private static buttonActionToUrl(action: ButtonAction): string {
			// TODO: Change any to ButtonAction when typings is updated.
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
}
