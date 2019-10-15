import { CustomError } from '../../shared/helpers/error';
import { LogEvent } from './types';
import { INSERT_EVENTS } from './queries.gql';
import axios, { AxiosResponse } from 'axios';

export default class EventLoggingService {
	public static async insertEvents(logEvents: LogEvent[]): Promise<void> {
		let url: string;
		try {
			url = process.env.GRAPHQL_LOGGING_URL;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_LOGGING_SECRET,
				},
				data: {
					INSERT_EVENTS,
					variables: {
						eventLogEntries: logEvents,
					},
				},
			});
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
}
