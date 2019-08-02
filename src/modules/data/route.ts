import { Path, POST } from 'typescript-rest';
import { GraphQlService } from '../../services/graphql';
import { RecursiveError } from '../../helpers/recursiveError';
import axios, { AxiosResponse } from 'axios';

interface DataQuery {
	query: any;
	variables: any;
}

@Path('/data')
export default class DataRoute {

	/**
	 * Endpoint that is proxied to the graphql server so the client can collect data
	 * @param body
	 */
	@Path('')
	@POST
	async post(body: DataQuery): Promise<any> {
		let url;
		try {
			url = process.env.GRAPHQL_URL;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
				data: {
					query: body.query,
					variables: body.variables,
				},
			});
			return response.data;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get data from database',
				err,
				{
					...body,
				});
		}
	}
}
