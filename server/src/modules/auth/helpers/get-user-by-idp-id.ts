import * as _ from 'lodash';

import DataService from '../../data/service';
import { GET_USER_BY_IDP_ID } from '../queries.gql';
import { IdpType } from '../types';

export async function getUserByIdpId(idpType: IdpType, idpId: string): Promise<string | null> {
	const response = await DataService.execute(GET_USER_BY_IDP_ID, {
		idpType,
		idpId,
	});
	return _.get(response, 'data.shared_users[0].uid', null);
}
