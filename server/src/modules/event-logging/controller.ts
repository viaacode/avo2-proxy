import { Request } from 'express';
import { compact } from 'lodash';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import EventLoggingService from './service';
import { LogEvent } from './types';

// TODO move to typings repo after update to typings v2.22.0
export type EventAction =
	| 'register'
	| 'activate'
	| 'create'
	| 'edit'
	| 'delete'
	| 'request'
	| 'reset'
	| 'authenticate'
	| 'logout'
	| 'send'
	| 'view'
	| 'play'
	| 'bookmark'
	| 'share'
	| 'report'
	| 'publish'
	| 'unpublish'
	| 'copy'
	| 'add_to'
	| 'remove_from';

export interface ClientEvent {
	action: EventAction;
	subject: string; // entity doing the modification
	subject_type: EventSubjectType;
	object: string; // entity being modified
	object_type: EventObjectType;
	message: any; // user played item xxx on avo
	occurred_at: string | null;
	source_url: string; // eg: url when the event was triggered
}

export type EventSubjectType = 'user' | 'system';

export type EventObjectType =
	| 'account'
	| 'profile'
	| 'password'
	| 'user'
	| 'mail'
	| 'information'
	| 'item'
	| 'collection'
	| 'bundle'
	| 'assignment'
	| 'search';

export default class EventLoggingController {
	public static async insertEvent(event: ClientEvent, request: Request): Promise<void> {
		await EventLoggingController.insertEvents([event], request);
	}

	public static async insertEvents(clientEvents: ClientEvent[], request: Request): Promise<void> {
		let logEvents: LogEvent[] = [];
		let ip: string;
		let requestId: string;
		try {
			ip = EventLoggingController.getIp(request) || '127.0.0.1';
			requestId = EventLoggingController.getViaaRequestId(request);
			logEvents = compact(
				clientEvents.map((clientEvent: ClientEvent): LogEvent | null => {
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
