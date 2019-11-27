import _ from 'lodash';
import * as util from 'util';
import { Context, Path, ServiceContext, POST } from 'typescript-rest';

import EventLoggingController from './controller';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
import { ClientEvent } from '@viaa/avo2-types/types/event-logging/types';

const publicIp = require('public-ip');

@Path('/event-logging')
export default class EventLoggingRoute {
	@Context
	context: ServiceContext;

	/**
	 * Insert log event into graphql db
	 */
	@Path('')
	@POST
	async insertEvent(clientEvents: ClientEvent | ClientEvent[] | null): Promise<any> {
		if (!clientEvents) {
			throw new BadRequestError('body must contain the event you want to log');
		}
		const clientEventArray: ClientEvent[] = _.isArray(clientEvents) ? clientEvents : [clientEvents];
		try {
			return await EventLoggingController.insertEvents(
				clientEventArray,
				EventLoggingRoute.getIp(this.context),
				EventLoggingRoute.getViaaRequestId(this.context),
			);
		} catch (err) {
			const error = new CustomError('Failed during insert event route', err, {});
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}

	private static getIp(context: ServiceContext): string | null {
		return context.request.headers['x-real-ip'] as string || null;
	}

	private static getViaaRequestId(context: ServiceContext): string | null {
		return context.request.headers['x-viaa-request-id'] as string || null;
	}
}
