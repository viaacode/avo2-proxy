import { Requests } from 'node-zendesk';

import { Avo } from '@viaa/avo2-types';

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

	static async uploadAttachment(
		fileInfo: Avo.FileUpload.ZendeskFileInfo
	): Promise<{ url: string; id: number }> {
		return await ZendeskService.uploadAttachment(fileInfo);
	}
}
