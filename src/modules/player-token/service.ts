import axios, { AxiosResponse } from 'axios';
import { RecursiveError } from '../../helpers/recursiveError';
import * as https from 'https';

export interface PlayerTokenResponse {
	total: number;
	name: string;
	results: PlayerTokenResult[];
}

interface PlayerTokenResult {
	jwt: string;
	app: string;
	verb: string;
	name: string;
	useragent: string;
	client: string;
	expiration: string;
}


export default class PlayerTokenService {
	private static httpsAgent = new https.Agent({
		rejectUnauthorized: false,
		cert: process.env.PLAYER_TOKEN_CERT_PEM, // TODO add these to the openshift env variables
		key: process.env.PLAYER_TOKEN_KEY_PEM,
		passphrase: process.env.PLAYER_TOKEN_PASSPHRASE,
	});

	/**
	 * Get a player token, to be able to show a video/audio fragment for a limited time
	 * https://viaadocumentation.atlassian.net/wiki/spaces/AVO/pages/119308331/Request+Play+Token
	 * @param mediaUrl
	 * @param ip
	 * @param userAgent
	 * @param expire
	 */
	public static async getToken(mediaUrl: string, ip: string, userAgent: string, expire: number): Promise<PlayerTokenResponse> {
		try {
			const response: AxiosResponse<any> = await axios(mediaUrl, {
				method: 'get',
				httpsAgent: this.httpsAgent,
				data: {
					app: 'OR-h41jm1d', // TODO update with actual app id of avo2
					useragent: userAgent,
					verb: 'GET',
					client: ip,
					maxage: expire, // not mandatory
					format: [ 'mp4' ], // array of selected extensions or TRUE to receive all
				},
			});
			return response.data;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get data from database',
				err,
				{
					mediaUrl,
					ip,
					userAgent,
					expire,
				});
		}
	}
}
