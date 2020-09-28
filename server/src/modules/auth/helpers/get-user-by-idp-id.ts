import { get } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import DataService from '../../data/service';
import { GET_USER_BY_IDP_ID } from '../queries.gql';

export async function getUserByIdpId(
	idpType: Avo.Auth.IdpType,
	idpId: string
): Promise<string | null> {
	const response = await DataService.execute(GET_USER_BY_IDP_ID, {
		idpType,
		idpId,
	});
	return get(response, 'data.shared_users[0].uid', null);
}
