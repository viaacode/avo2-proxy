import axios, { AxiosResponse } from 'axios';
import { RecursiveError } from '../../helpers/recursiveError';

export default class DataService {
	public static async execute(query: any, variables: any): Promise<any> {
		let url;
		try {
			url = process.env.GRAPHQL_URL;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
				data: {
					query,
					variables,
				},
			});
			return response.data;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get data from database',
				err,
				{
					query,
					variables,
				});
		}
	}
}
