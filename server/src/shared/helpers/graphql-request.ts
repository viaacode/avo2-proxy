import axios, { AxiosRequestConfig } from 'axios';

import { CustomError } from './error';

export async function graphqlQueryRequest(options: AxiosRequestConfig): Promise<any> {
	const response = await axios({
		url: process.env.GRAPHQL_URL.replace('/v1/graphql', '/v1/query'),
		headers: {
			'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
			...(options.headers || {}),
		},
		...options,
	});

	if (response.status < 200 && response.status >= 400) {
		throw new CustomError('Response has error code', null, {
			response,
		});
	}

	if (response && response.data.error) {
		throw new CustomError('Response contains errors', null, {
			response,
		});
	}

	return response.data;
}
