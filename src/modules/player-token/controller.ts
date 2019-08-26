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
		const response = await DataService.execute(GET_ITEM_BY_ID, { id: externalId });
		const browsePath: string = _.get(response, 'data.app_item_meta[0].browse_path');

		if (!browsePath) {
			throw new RecursiveError('Failed to get token for item since it doesn\'t have a browse_path value', null, {
				browsePath,
				externalId,
			});
		}

		const objectName: string | undefined = browsePath.split('archief-media.viaa.be/viaa/').pop();

		if (!objectName) {
			throw new RecursiveError('Failed to extract object name from browse path for media item', null, {
				browsePath,
				objectName,
				externalId,
			});
		}

		const playerToken: PlayerToken = await PlayerTokenService.getToken(objectName, ip, referer, expire);

		return `${process.env.MEDIA_SERVICE_URL}/${objectName}?token=${playerToken.jwt}`;
	}
}
