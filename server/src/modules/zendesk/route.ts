import { Tickets } from 'node-zendesk';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';
import * as util from 'util';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { UploadAssetInfo } from '../assets/route';

import ZendeskController from './controller';

export interface ZendeskFileInfo {
	// TODO use typings version
	base64: string;
	filename: string;
	mimeType: string;
}

@Path('/zendesk')
export default class ZendeskRoute {
	@Context
	context: ServiceContext;

	/**
	 * Create a zendesk issue
	 */
	@Path('')
	@POST
	async createTicket(ticket: Tickets.CreateModel): Promise<Tickets.ResponseModel> {
		try {
			if (!ticket || !ticket.comment) {
				throw new BadRequestError(
					'Body must be the ticket that you want to create and the comment property on the ticket is required',
					null,
					{ ticket }
				);
			}
			return await ZendeskController.createTicket(ticket);
		} catch (err) {
			const error = new InternalServerError('Failed to create ticket through the zendesk api', err, { ticket });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}

	/**
	 * Create a zendesk attachment
	 */
	@Path('/upload-attachment')
	@POST
	async uploadAttachment(fileInfo: ZendeskFileInfo): Promise<{url: string, id: number}> {
		try {
			if (!fileInfo || !fileInfo.filename || !fileInfo.base64) {
				throw new BadRequestError(
					'Body must contain a "filename" and the "base64" encoded file content',
					null,
					{ fileInfo }
				);
			}
			return await ZendeskController.uploadAttachment(fileInfo);
		} catch (err) {
			const error = new InternalServerError('Failed to upload file to the zendesk api', err, { fileInfo });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
