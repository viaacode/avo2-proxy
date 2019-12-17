import { Tickets } from 'node-zendesk';
import ZendeskService from './service';

export default class ZendeskController {

	/**
	 * Create a new ticket in zendesk
	 * @param ticket
	 */
	public static async createTicket(ticket: Tickets.CreateModel): Promise<Tickets.ResponseModel> {
		return await ZendeskService.createTicket(ticket);
	}
}
