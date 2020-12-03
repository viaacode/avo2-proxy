import axios, { AxiosResponse } from 'axios';
import { get } from 'lodash';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { InternalServerError } from '../../shared/helpers/error';

import { INSERT_EVENTS } from './queries.gql';
import { LogEvent } from './types';

checkRequiredEnvs(['GRAPHQL_LOGGING_URL']);

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
			const errors = get(response, 'data.errors');
			if (errors) {
				throw new InternalServerError('Failed to insert event into the database', null, {
					logEvents,
					url,
					errors,
				});
			}
			return response.data;
		} catch (err) {
			throw new InternalServerError('Failed to insert event into the database', err, {
				logEvents,
				url,
			});
		}
	}
}
