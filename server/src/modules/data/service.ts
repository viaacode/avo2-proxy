import axios, { AxiosResponse } from 'axios';
import { CustomError } from '../../shared/helpers/error';

export default class DataService {
	public static async execute(query: string, variables: {[varName: string]: any}): Promise<any> {
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
			throw new CustomError(
				'Failed to get data from database',
				err,
				{
					query,
					variables,
				});
		}
	}
}
