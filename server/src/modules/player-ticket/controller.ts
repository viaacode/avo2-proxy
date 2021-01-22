import { get } from 'lodash';

import { InternalServerError } from '../../shared/helpers/error';
import DataService from '../data/data.service';

import { GET_ITEM_BY_EXTERNAL_ID } from './queries.gql';
import PlayerTicketService, { PlayerTicket } from './service';

export default class PlayerTicketController {
	/**
	 * Gets a playable url for a given media item
	 * https://viaadocumentation.atlassian.net/wiki/spaces/SI/pages/1063453019/Media+Service
	 * @param externalId: external_id of the media item that you want to view
	 * @param ip
	 * @param expire
	 */
	public static async getPlayableUrl(
		externalId: string,
		ip: string,
		expire: number
	): Promise<string> {
		try {
			const response = await DataService.execute(GET_ITEM_BY_EXTERNAL_ID, { externalId });

			const browsePath: string = get(response, 'data.app_item_meta[0].browse_path');

			if (!browsePath) {
				throw new InternalServerError(
					'Failed to get token for item since the item was not found or it does not have a browse_path',
					null,
					{
						browsePath,
						externalId,
						query: GET_ITEM_BY_EXTERNAL_ID,
					}
				);
			}

			return PlayerTicketController.getPlayableUrlFromBrowsePath(
				browsePath,
				ip,
				expire
			);
		} catch (err) {
			throw new InternalServerError('Failed to get player ticket', err, {
				externalId,
				ip,
				expire,
			});
		}
	}

	public static async getPlayableUrlFromBrowsePath(
		browsePath: string,
		ip: string,
		expire: number
	): Promise<string> {
		try {
			const objectName: string | undefined = browsePath
				.split('archief-media.viaa.be/viaa/')
				.pop();

			if (!objectName) {
				throw new InternalServerError(
					'Failed to extract object name from browse path for media item',
					null,
					{
						browsePath,
						objectName,
					}
				);
			}

			const playerTicket: PlayerTicket = await PlayerTicketService.getPlayerTicket(
				objectName,
				ip,
				expire
			);

			return `${process.env.MEDIA_SERVICE_URL}/${objectName}?token=${playerTicket.jwt}`;
		} catch (err) {
			throw new InternalServerError('Failed to get player ticket', err, {
				ip,
				expire,
			});
		}
	}
}
