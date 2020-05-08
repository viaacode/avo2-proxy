import _ from 'lodash';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';
import * as util from 'util';

import { ClientEvent } from '@viaa/avo2-types/types/event-logging';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import EventLoggingController from './controller';

@Path('/event-logging')
export default class EventLoggingRoute {
	@Context
	context: ServiceContext;

	/**
	 * Insert log event into graphql db
	 */
	@Path('')
	@POST
	async insertEvent(clientEvents: ClientEvent | ClientEvent[] | null): Promise<void> {
		if (!clientEvents) {
			throw new BadRequestError('body must contain the event you want to log');
		}
		const clientEventArray: ClientEvent[] = _.isArray(clientEvents) ? clientEvents : [clientEvents];
		EventLoggingController.insertEvents(
			clientEventArray,
			EventLoggingRoute.getIp(this.context),
			EventLoggingRoute.getViaaRequestId(this.context),
		).then(() => {
			logger.info('event inserted');
		}).catch((err) => {
			const error = new InternalServerError('Failed during insert event route', err, {});
			logger.error(util.inspect(error));
			throw util.inspect(error);
		});
		return; // Return before event is inserted, since we do not want to hold up the client if the event fails to be inserted
	}

	private static getIp(context: ServiceContext): string | null {
		return context.request.headers['x-real-ip'] as string || null;
	}

	private static getViaaRequestId(context: ServiceContext): string | null {
		return context.request.headers['x-viaa-request-id'] as string || null;
	}
}
