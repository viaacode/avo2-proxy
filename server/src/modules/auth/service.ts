import _ from 'lodash';

import DataService from '../data/service';
import { GET_USER_INFO_BY_ID, GET_USER_INFO_BY_USER_EMAIL } from './queries.gql';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { SharedUser } from './types';

export class AuthService {
	public static async getAvoUserInfoByEmail(email: string): Promise<SharedUser> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_USER_EMAIL, { email });
			if (response.errors) {
				throw new InternalServerError(
					'Failed to get user info from graphql by user email',
					null,
					{ email, errors: response.errors }
				);
			}
			return _.get(response, 'data.users[0]', null);
		} catch (err) {
			throw new InternalServerError(
				'Failed to get user info from graphql by user email',
				err,
				{ email }
			);
		}
	}

	public static async getAvoUserInfoById(userId: string): Promise<SharedUser> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_ID, { userId });
			if (response.errors) {
				throw new ExternalServerError(
					'Failed to get user info from graphql by user uid',
					null,
					{ userId, errors: response.errors }
				);
			}
			return _.get(response, 'data.users[0]', null);
		} catch (err) {
			throw new InternalServerError(
				'Failed to get user info from graphql by user uid',
				err,
				{ userId }
			);
		}
	}
}
