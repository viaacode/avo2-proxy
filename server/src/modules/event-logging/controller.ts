import * as _ from 'lodash';

import EventLoggingService from './service';
import { InternalServerError } from '../../shared/helpers/error';
import { LogEvent } from './types';
import { ClientEvent } from '@viaa/avo2-types/types/event-logging';

export default class EventLoggingController {
	public static async insertEvents(clientEvents: ClientEvent[], ip: string, requestId: string): Promise<void> {
		let logEvents: LogEvent[] = [];
		try {
			logEvents = _.compact(clientEvents.map((clientEvent: ClientEvent): LogEvent | null => {
				return {
					subject_ip: ip || '127.0.0.1',
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
			}));

			await EventLoggingService.insertEvents(logEvents);
		} catch (err) {
			throw new InternalServerError('Failed to insert log events in controller', err, { clientEvents, ip, requestId, logEvents });
		}
	}
}
