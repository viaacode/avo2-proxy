import { Requests } from 'node-zendesk';

import { ZendeskFileInfo } from './route';
import ZendeskService from './service';

export default class ZendeskController {
	/**
	 * Create a new ticket in zendesk
	 * @param request
	 */
	public static async createTicket(
		request: Requests.CreateModel
	): Promise<Requests.ResponseModel> {
		return await ZendeskService.createTicket(request);
	}

	static async uploadAttachment(fileInfo: ZendeskFileInfo): Promise<{ url: string; id: number }> {
		return await ZendeskService.uploadAttachment(fileInfo);
	}
}
