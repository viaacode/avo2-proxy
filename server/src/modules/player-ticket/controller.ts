import PlayerTicketService, { PlayerTicket } from './service';
import DataService from '../data/service';
import { GET_ITEM_BY_ID } from './queries.gql';
import { get } from 'lodash';
import { InternalServerError } from '../../shared/helpers/error';

export interface PlayerTicketResponse {
	url: string;
}

export default class PlayerTicketController {

	/**
	 * Gets a playable url for a given media item
	 * https://viaadocumentation.atlassian.net/wiki/spaces/SI/pages/1063453019/Media+Service
	 * @param externalId: external_id of the media item that you want to view
	 * @param ip
	 * @param referrer
	 * @param expire
	 */
	public static async getPlayableUrl(externalId: string, ip: string, referrer: string, expire: number): Promise<PlayerTicketResponse> {
		try {
			const response = await DataService.execute(GET_ITEM_BY_ID, { id: externalId });

			const browsePath: string = get(response, 'data.app_item_meta[0].browse_path');

			if (!browsePath) {
				throw new InternalServerError('Failed to get token for item since it doesn\'t have a browse_path value', null, {
					browsePath,
					externalId,
				});
			}

			const objectName: string | undefined = browsePath.split('archief-media.viaa.be/viaa/').pop();

			if (!objectName) {
				throw new InternalServerError('Failed to extract object name from browse path for media item', null, {
					browsePath,
					objectName,
					externalId,
				});
			}

			const playerTicket: PlayerTicket = await PlayerTicketService.getPlayerTicket(objectName, ip, referrer, expire);

			return {
				url: `${process.env.MEDIA_SERVICE_URL}/${objectName}?token=${playerTicket.jwt}`,
			};
		} catch (err) {
			throw new InternalServerError('Failed to get player ticket', err, { externalId, ip, referrer, expire });
		}
	}
}
