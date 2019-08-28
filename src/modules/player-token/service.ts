import axios, { AxiosResponse } from 'axios';
import { RecursiveError } from '../../helpers/recursiveError';
import * as https from 'https';
import * as fs from 'fs';

export interface PlayerToken {
	jwt: string;
	context: {
		aud: string;
		exp: number;
		sub: string;
		ip: string;
		referer: string;
		fragment: {
			start: string;
			end: string;
		};
	};
}

if (!process.env.TICKET_SERVICE_CERT) {
	throw new RecursiveError('Environment variable TICKET_SERVICE_CERT has to be filled in');
}
if (!process.env.TICKET_SERVICE_KEY) {
	throw new RecursiveError('Environment variable TICKET_SERVICE_KEY has to be filled in');
}
if (!process.env.TICKET_SERVICE_PASSPHRASE) {
	throw new RecursiveError('Environment variable TICKET_SERVICE_PASSPHRASE has to be filled in');
}

export default class PlayerTokenService {
	private static cert = fs.readFileSync('C:/Users/bert/Documents/studiohyperdrive/projects/VIAA/flowplayer/player-token/viaa_cert.cert');
	private static key = fs.readFileSync('C:/Users/bert/Documents/studiohyperdrive/projects/VIAA/flowplayer/player-token/viaa_cert.key');
	private static httpsAgent = new https.Agent({
		rejectUnauthorized: false,
		// cert: PlayerTokenService.cert,
		// key: PlayerTokenService.key,
		// passphrase: process.env.TICKET_SERVICE_PASSPHRASE,
		cert: PlayerTokenService.cert,
		key: PlayerTokenService.key,
		passphrase: '3p4Kqt4xGn7kvYBRVRJh',
	});

	/**
	 * Get a player token, to be able to show a video/audio fragment for a limited time
	 * https://viaadocumentation.atlassian.net/wiki/spaces/SI/pages/108342960/Ticket+Service
	 * @param objectName
	 * @param clientIp
	 * @param referer
	 * @param expire
	 */
	public static async getToken(objectName: string, clientIp: string, referer: string, expire: number): Promise<PlayerToken> {
		try {
			if (!process.env.TICKET_SERVICE_URL) {
				throw new RecursiveError('TICKET_SERVICE_URL env variable is not set', null, { url: process.env.TICKET_SERVICE_URL });
			}
			const data = {
				app: 'OR-avo2',
				referer,
				client: clientIp,
			};
			const response: AxiosResponse<any> = await axios(`${process.env.TICKET_SERVICE_URL}/${objectName}`, {
				method: 'get',
				httpsAgent: this.httpsAgent,
				data,
			});
			return response.data;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get player-token from player-token service',
				err,
				{
					clientIp,
					referer,
					expire,
				});
		}
	}
}
