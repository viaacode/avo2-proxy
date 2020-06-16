import axios, { AxiosResponse } from 'axios';

import { CustomError, InternalServerError } from '../../shared/helpers/error';

import { GET_EDUCATION_LEVELS } from './queries.gql';

export default class EducationLevelsService {

	public static async getEducationLevels(): Promise<void> {
		let url: string;
		const data = {
			query: GET_EDUCATION_LEVELS,
		};

		try {
			url = process.env.GRAPHQL_URL as string;

			const response: AxiosResponse<any> = await axios(url, {
				data,
				method: 'post',
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
			});

			if (response.data.errors) {
				const error = new CustomError('GraphQL query failed', null, { query: data.query, errors: response.data.errors });

				throw error;
			}

			return response.data;
		} catch (err) {
			throw new InternalServerError(
				'Failed to retrieve education levels from GraphQL database.',
				err,
				data
			);
		}
	}
}
