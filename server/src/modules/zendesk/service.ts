import * as util from 'util';
import zendesk, { Client, Tickets } from 'node-zendesk';
import _ from 'lodash';
import axios from 'axios';
import * as queryString from 'querystring';

import { BadRequestError, CustomError, ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';

import { ZendeskFileInfo } from './route';

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
					error ? reject(error) : resolve(result);
				});
			} catch (err) {
				const error = new ExternalServerError('Failed to create ticket through the zendesk api', err, { ticket });
				logger.error(util.inspect(error));
				reject(error);
			}
		});
	}

	static async uploadAttachment(fileInfo: ZendeskFileInfo): Promise<{ url: string, id: number }> {
		try {
			const base64Code = (fileInfo.base64.split(';base64,').pop() || '').trim();
			if (!base64Code) {
				throw new BadRequestError(
					'Failed to upload file because the base64 code was invalid',
					null,
					{ base64String: fileInfo.base64 }
				);
			}
			const buffer = new Buffer(base64Code, 'base64');
			const response = await axios.post(
				`${process.env.ZENDESK_ENDPOINT}/uploads.json?${queryString.stringify({
					filename: fileInfo.filename,
				})}`,
				buffer,
				{
					headers: {
						'Content-Type': 'application/binary',
					},
					auth: {
						username: process.env.ZENDESK_USERNAME,
						password: process.env.ZENDESK_TOKEN,
					},
				});
			if (response.status < 200 && response.status >= 400) {
				throw new CustomError(
					'Failed to upload file to zendesk api, unexpected status code in response',
					null,
					{ response }
				);
			}
			const attachmentInfo = {
				url: _.get(response, 'data.upload.attachment.content_url'),
				id: _.get(response, 'data.upload.attachment.id'),
			};
			if (!attachmentInfo.url || !attachmentInfo.id) {
				throw new ExternalServerError(
					'Upload of attachment to zendesk returned an unexpected response',
					null,
					{ response }
				);
			}
			return attachmentInfo;
		} catch (err) {
			const error = new ExternalServerError(
				'Failed to upload file to zendesk attachment api', err, { fileInfo });
			logger.error(util.inspect(error));
			throw error;
		}
	}
}
