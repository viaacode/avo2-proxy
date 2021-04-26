import axios, { AxiosResponse } from 'axios';
import * as https from 'https';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { InternalServerError } from '../../shared/helpers/error';

export interface PlayerTicket {
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

checkRequiredEnvs(['TICKET_SERVICE_CERT', 'TICKET_SERVICE_KEY', 'TICKET_SERVICE_PASSPHRASE']);

export default class PlayerTicketService {
	private static certEnv = Buffer.from(
		(process.env.TICKET_SERVICE_CERT as string).replace(/\\n/g, '\n'),
		'utf8'
	);
	private static keyEnv = Buffer.from(
		(process.env.TICKET_SERVICE_KEY as string).replace(/\\n/g, '\n'),
		'utf8'
	);
	private static httpsAgent = new https.Agent({
		rejectUnauthorized: false,
		cert: PlayerTicketService.certEnv,
		key: PlayerTicketService.keyEnv,
		passphrase: process.env.TICKET_SERVICE_PASSPHRASE,
	});

	/**
	 * Get a player token, to be able to show a video/audio fragment for a limited time
	 * https://viaadocumentation.atlassian.net/wiki/spaces/SI/pages/108342960/Ticket+Service
	 * @param objectName
	 * @param clientIp
	 * @param referer
	 * @param expire
	 */
	public static async getPlayerTicket(
		objectName: string,
		clientIp: string,
		referer: string = '',
		expire: number
	): Promise<PlayerTicket> {
		try {
			if (!process.env.TICKET_SERVICE_URL) {
				throw new InternalServerError('TICKET_SERVICE_URL env variable is not set', null, {
					url: process.env.TICKET_SERVICE_URL,
				});
			}

			const data = {
				referer,
				app: 'OR-avo2',
				client: clientIp,
				maxage: expire,
			};

			const response: AxiosResponse<any> = await axios(
				`${process.env.TICKET_SERVICE_URL}/${objectName}`,
				{
					data,
					method: 'get',
					httpsAgent: this.httpsAgent,
				}
			);

			return response.data;
		} catch (err) {
			throw new InternalServerError(
				'Failed to get player-token from player-token service',
				err,
				{
					clientIp,
					referer,
					expire,
				}
			);
		}
	}
}
