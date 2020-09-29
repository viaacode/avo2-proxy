import { isArray } from 'lodash';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError } from '../../shared/helpers/error';

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
	async insertEvent(
		clientEvents: Avo.EventLogging.Event | Avo.EventLogging.Event[] | null
	): Promise<void> {
		if (!clientEvents) {
			throw new BadRequestError('body must contain the event you want to log');
		}
		const clientEventArray: Avo.EventLogging.Event[] = isArray(clientEvents)
			? clientEvents
			: [clientEvents];
		EventLoggingController.insertEvents(clientEventArray, this.context.request);
		return; // Return before event is inserted, since we do not want to hold up the client if the event fails to be inserted
	}
}
