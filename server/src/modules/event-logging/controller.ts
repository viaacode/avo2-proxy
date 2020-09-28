import { Request } from 'express';
import { compact } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import EventLoggingService from './service';
import { LogEvent } from './types';

export default class EventLoggingController {
	public static async insertEvent(
		event: Avo.EventLogging.Event,
		request: Request
	): Promise<void> {
		await EventLoggingController.insertEvents([event], request);
	}

	public static async insertEvents(
		clientEvents: Avo.EventLogging.Event[],
		request: Request
	): Promise<void> {
		let logEvents: LogEvent[] = [];
		let ip: string;
		let requestId: string;
		try {
			ip = EventLoggingController.getIp(request) || '127.0.0.1';
			requestId = EventLoggingController.getViaaRequestId(request);
			logEvents = compact(
				clientEvents.map((clientEvent: Avo.EventLogging.Event): LogEvent | null => {
					return {
						subject_ip: ip,
						component: 'webapp',
						namespace: 'avo',
						action: clientEvent.action,
						message: clientEvent.message,
						object: clientEvent.object,
						object_type: clientEvent.object_type,
						source_url: clientEvent.source_url,
						subject: clientEvent.subject,
						subject_type: clientEvent.subject_type,
						occurred_at: clientEvent.occurred_at,
						is_system: false,
						trace_id: requestId,
						parent_id: null,
					};
				})
			);

			await EventLoggingService.insertEvents(logEvents);
		} catch (err) {
			const error = new InternalServerError(
				'Failed to insert log events in controller',
				err,
				{
					clientEvents,
					ip,
					requestId,
					logEvents,
				}
			);
			logger.error(error);
		}
	}

	private static getIp(request: Request): string | null {
		return (request.headers['x-real-ip'] as string) || null;
	}

	private static getViaaRequestId(request: Request): string | null {
		return (request.headers['x-viaa-request-id'] as string) || null;
	}
}
