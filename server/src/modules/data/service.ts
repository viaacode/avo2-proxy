import axios, { AxiosResponse } from 'axios';
import { CustomError, InternalServerError } from '../../shared/helpers/error';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { logger } from '../../shared/helpers/logger';

checkRequiredEnvs([
	'GRAPHQL_URL',
]);

export default class DataService {
	public static async execute(query: string, variables: { [varName: string]: any } = {}, headers: { [headerName: string]: string } = {}): Promise<any> {
		let url;
		let data;
		try {
			url = process.env.GRAPHQL_URL as string;
			data = {
				query,
				variables,
			};
			const response: AxiosResponse<any> = await axios(url, {
				data,
				method: 'post',
				headers: {
					...headers,
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
			});
			if (response.data.errors) {
				logger.error('graphql error during data fetch route: ', response.data.errors);
				throw new CustomError('GraphQL query failed', null, { ...data, errors: response.data.errors });
			}
			return response.data;
		} catch (err) {
			throw new InternalServerError(
				'Failed to get data from database',
				err,
				{
					query,
					variables,
				});
		}
	}
}
