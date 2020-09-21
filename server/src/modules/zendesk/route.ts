import { Requests } from 'node-zendesk';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import ZendeskController from './controller';

@Path('/zendesk')
export default class ZendeskRoute {
	@Context
	context: ServiceContext;

	/**
	 * Create a zendesk issue
	 */
	@Path('')
	@POST
	async createTicket(request: Requests.CreateModel): Promise<Requests.ResponseModel> {
		try {
			if (!request || !request.comment) {
				throw new BadRequestError(
					'Body must be the ticket that you want to create and the comment property on the ticket is required',
					null,
					{ request }
				);
			}
			return await ZendeskController.createTicket(request);
		} catch (err) {
			const error = new InternalServerError(
				'Failed to create ticket through the zendesk api',
				err,
				{ request }
			);
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Create a zendesk attachment
	 */
	@Path('/upload-attachment')
	@POST
	async uploadAttachment(fileInfo: Avo.FileUpload.ZendeskFileInfo): Promise<{ url: string; id: number }> {
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
			const error = new InternalServerError('Failed to upload file to the zendesk api', err, {
				fileInfo,
			});
			logger.error(error);
			throw error;
		}
	}
}
