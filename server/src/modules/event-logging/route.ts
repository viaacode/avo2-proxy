import _ from 'lodash';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';

import { BadRequestError } from '../../shared/helpers/error';

import EventLoggingController, { ClientEvent } from './controller';

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
		const clientEventArray: ClientEvent[] = _.isArray(clientEvents)
			? clientEvents
			: [clientEvents];
		EventLoggingController.insertEvents(clientEventArray, this.context.request);
		return; // Return before event is inserted, since we do not want to hold up the client if the event fails to be inserted
	}
}
