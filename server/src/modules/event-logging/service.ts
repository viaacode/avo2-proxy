import { CustomError } from '../../shared/helpers/error';
import { EventLabel, LogEvent } from './types';
import { GET_EVENT_LABELS, INSERT_EVENTS } from './queries.gql';
import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';

if (!process.env.GRAPHQL_LOGGING_URL) {
	throw new CustomError('The environment variable GRAPHQL_LOGGING_URL should have a value.');
}

export default class EventLoggingService {
	public static async insertEvents(logEvents: LogEvent[]): Promise<void> {
		let url: string | undefined = undefined;
		try {
			url = process.env.GRAPHQL_LOGGING_URL as string;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_LOGGING_SECRET,
				},
				data: {
					query: INSERT_EVENTS,
					variables: {
						eventLogEntries: logEvents,
					},
				},
			});
			const errors = _.get(response, 'data.errors');
			if (errors) {
				throw new CustomError(
					'Failed to insert event into the database',
					null,
					{
						logEvents,
						url,
						errors,
					});
			}
			return response.data;
		} catch (err) {
			throw new CustomError(
				'Failed to insert event into the database',
				err,
				{
					logEvents,
					url,
				});
		}
	}

	public static async getEventLabels(): Promise<EventLabel[]> {
		let url: string | undefined = undefined;
		try {
			url = process.env.GRAPHQL_LOGGING_URL as string;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_LOGGING_SECRET,
				},
				data: {
					query: GET_EVENT_LABELS,
				},
			});
			if (response.data.errors && response.data.errors.length) {
				throw new CustomError(
					'Failed to get event labels from the events graphql db',
					null,
					{ errors: response.data.errors }
				);
			}
			return _.get(response, 'data.data.event_labels', []);
		} catch (err) {
			throw new CustomError(
				'Failed to get event labels from the events graphql db',
				err,
				{
					url,
					query: GET_EVENT_LABELS,
				});
		}
	}
}
