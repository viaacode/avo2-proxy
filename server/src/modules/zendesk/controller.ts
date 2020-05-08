import { Tickets } from 'node-zendesk';

import { ZendeskFileInfo } from './route';
import ZendeskService from './service';

export default class ZendeskController {

	/**
	 * Create a new ticket in zendesk
	 * @param ticket
	 */
	public static async createTicket(ticket: Tickets.CreateModel): Promise<Tickets.ResponseModel> {
		return await ZendeskService.createTicket(ticket);
	}

	static async uploadAttachment(fileInfo: ZendeskFileInfo): Promise<{url: string, id: number}> {
		return await ZendeskService.uploadAttachment(fileInfo);
	}
}
