import * as _ from 'lodash';

import EventLoggingService from './service';
import { CustomError } from '../../shared/helpers/error';
import { EventLabel, LogEvent } from './types';
import { GET_EVENT_LABELS } from './queries.gql';
import { logger } from '../../shared/helpers/logger';
import { ClientEvent, EventCategory, EventName } from '@viaa/avo2-types/types/event-logging/types';

export default class EventLoggingController {
	private static eventLabels: EventLabel[];

	/**
	 * Get event names and categories from the database and stores them in memory
	 */
	public static async initialize() {
		try {
			logger.info('caching event labels...');
			EventLoggingController.eventLabels = await EventLoggingService.getEventLabels();
			if (!EventLoggingController.eventLabels || !EventLoggingController.eventLabels.length) {
				logger.error('No event labels were found in the database. These are required for event logging to work properly.', { query: GET_EVENT_LABELS });
			}
			logger.info('caching event labels... done');
		} catch (err) {
			logger.info('caching event labels... error');
			logger.error('Failed to get event labels from graphql', err, { query: GET_EVENT_LABELS });
		}
	}

	private static getLabel(category: EventCategory, name: EventName): EventLabel | undefined {
		return _.find(EventLoggingController.eventLabels, { category, name });
	}

	public static async insertEvents(clientEvents: ClientEvent[], ip: string): Promise<void> {
		try {
			const logEvents: LogEvent[] = _.compact(clientEvents.map((clientEvent: ClientEvent): LogEvent | null => {
				const label: EventLabel | undefined = EventLoggingController.getLabel(clientEvent.category, clientEvent.name);
				if (label) {
					return {
						ip,
						agent_id: '7680d455-c6ff-42ab-b09c-9487bcc133e0',
						component: 'client',
						namespace: 'avo',
						event_label_id: label.id,
						event_message: clientEvent.event_message,
						event_object: clientEvent.event_object,
						event_source: clientEvent.event_source,
						event_subject: clientEvent.event_subject,
						event_timestamp: clientEvent.event_timestamp,
					};
				}
				logger.error('Failed to store event into graphql, matching event label was not found', { category: clientEvent.category, name: clientEvent.name });
				return null;
			}));

			await EventLoggingService.insertEvents(logEvents);
		} catch (err) {
			throw new CustomError('Failed to insert log events in controller', err, { clientEvents, ip });
		}
	}
}
