import axios, { AxiosResponse } from 'axios';
import { InternalServerError } from '../../shared/helpers/error';

if (!process.env.GRAPHQL_URL) {
	throw new InternalServerError('The environment variable GRAPHQL_URL should have a value.');
}

export default class DataService {
	public static async execute(query: string, variables: {[varName: string]: any} = {}, headers: {[headerName: string]: string} = {}): Promise<any> {
		let url;
		try {
			url = process.env.GRAPHQL_URL as string;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					...headers,
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
				data: {
					query,
					variables,
				},
			});
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
