import * as util from 'util';
import zendesk, { Client, Tickets } from 'node-zendesk';

import { ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';

export default class ZendeskService {
	private static client: Client;

	public static initialize() {
		checkRequiredEnvs(['ZENDESK_ENDPOINT', 'ZENDESK_USERNAME', 'ZENDESK_TOKEN']);
		ZendeskService.client = zendesk.createClient({
			username: process.env.ZENDESK_USERNAME,
			token: process.env.ZENDESK_TOKEN,
			remoteUri: process.env.ZENDESK_ENDPOINT,
		});
	}

	/**
	 * Create a new ticket in zendesk
	 * @param ticket
	 */
	public static async createTicket(ticket: Tickets.CreateModel): Promise<Tickets.ResponseModel> {
		return new Promise<Tickets.ResponseModel>((resolve, reject) => {
			try {
				ZendeskService.client.tickets.create({ ticket }, (error: Error | undefined, response: any, result: any) => {
					resolve(result);
				});
			} catch (err) {
				const error = new ExternalServerError('Failed to create ticket through the zendesk api', err, { ticket });
				logger.error(util.inspect(error));
				reject(error);
			}
		});
	}
}
