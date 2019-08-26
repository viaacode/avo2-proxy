import PlayerTokenService, { PlayerToken } from './service';
import DataService from '../data/service';
import { GET_ITEM_BY_ID } from './queries.gql';
import * as _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';

export default class PlayerTokenController {

	/**
	 * Gets a playable url for a given media item
	 * https://viaadocumentation.atlassian.net/wiki/spaces/SI/pages/1063453019/Media+Service
	 * @param externalId: external_id of the media item that you want to view
	 * @param ip
	 * @param referer
	 * @param expire
	 */
	public static async getToken(externalId: string, ip: string, referer: string, expire: number): Promise<string> {
		const playerToken: PlayerToken = await PlayerTokenService.getToken(ip, referer, expire);
		const browsePath: string = _.get(await DataService.execute(GET_ITEM_BY_ID, { id: externalId }), 'app_item_meta[0].browse_path');
		const objectName: string | undefined = browsePath.split('archief-media.viaa.be/viaa/').pop();

		if (!objectName) {
			throw new RecursiveError('Failed to extract object name from browse path for media item', null, {
				browsePath,
				objectName,
				externalId,
			});
		}

		return `${process.env.MEDIA_SERVICE_URL}/${objectName}?token=${playerToken.jwt}`;
	}
}
