import { Context, Path, ServiceContext, POST } from 'typescript-rest';
import ZendeskController from './controller';
import * as util from 'util';
import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError } from '../../shared/helpers/error';
import { Tickets } from 'node-zendesk';

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
}
