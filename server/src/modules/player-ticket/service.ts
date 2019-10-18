import axios, { AxiosResponse } from 'axios';
import * as https from 'https';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

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

if (!process.env.TICKET_SERVICE_CERT) {
	throw new CustomError('Environment variable TICKET_SERVICE_CERT has to be filled in');
}
if (!process.env.TICKET_SERVICE_KEY) {
	throw new CustomError('Environment variable TICKET_SERVICE_KEY has to be filled in');
}
if (!process.env.TICKET_SERVICE_PASSPHRASE) {
	throw new CustomError('Environment variable TICKET_SERVICE_PASSPHRASE has to be filled in');
}

export default class PlayerTicketService {
	private static certEnv = Buffer.from(
		(process.env.TICKET_SERVICE_CERT as string).replace(/\\n/g, '\n'),
		'utf8',
	);
	private static keyEnv = Buffer.from(
		(process.env.TICKET_SERVICE_KEY as string).replace(/\\n/g, '\n'),
		'utf8',
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
	public static async getPlayerTicket(objectName: string, clientIp: string, referer: string, expire: number): Promise<PlayerTicket> {
		try {
			if (!process.env.TICKET_SERVICE_URL) {
				throw new CustomError(
					'TICKET_SERVICE_URL env variable is not set',
					null,
					{ url: process.env.TICKET_SERVICE_URL }
				);
			}

			const data = {
				referer,
				app: 'OR-avo2',
				client: clientIp,
			};

			logger.info({
				data,
				url: `${process.env.TICKET_SERVICE_URL}/${objectName}`,
				method: 'get',
			});

			const response: AxiosResponse<any> = await axios(`${process.env.TICKET_SERVICE_URL}/${objectName}`, {
				data,
				method: 'get',
				httpsAgent: this.httpsAgent,
			});

			return response.data;
		} catch (err) {

			logger.info('FAILED IN TICKET SERVICE', JSON.stringify(err, null, 2));

			throw new CustomError(
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
