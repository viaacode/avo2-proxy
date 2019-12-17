import { ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import zendesk, { Client, Tickets } from 'node-zendesk';
import * as util from 'util';

export default class ZendeskService {
	private static createTicketPromised: (ticket: Tickets.CreatePayload) => Promise<Tickets.ResponsePayload>;
	private static client: Client;

	public static initialize() {
		checkRequiredEnvs(['ZENDESK_ENDPOINT', 'ZENDESK_USERNAME', 'ZENDESK_TOKEN']);
		ZendeskService.client = zendesk.createClient({
			username: process.env.ZENDESK_USERNAME,
			token: process.env.ZENDESK_TOKEN,
			remoteUri: process.env.ZENDESK_ENDPOINT,
		});
		ZendeskService.createTicketPromised =
			util.promisify(ZendeskService.client.tickets.create) as (ticket: Tickets.CreatePayload) => Promise<Tickets.ResponsePayload>;
	}

	/**
	 * Create a new ticket in zendesk
	 * @param ticket
	 */
	public static async createTicket(ticket: Tickets.CreateModel): Promise<Tickets.ResponseModel> {
		try {
			const response = await this.createTicketPromised({ ticket });
			return response.ticket;
		} catch (err) {
			const error = new ExternalServerError('Failed to create ticket through the zendesk api', err, { ticket });
			logger.error(util.inspect(error));
			throw error;
		}
	}
}
