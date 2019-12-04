import { Request } from 'express';

import { InternalServerError } from '../../shared/helpers/error';
import StamboekService from './service';
import { AuthService } from '../auth/service';
import { IdpHelper } from '../auth/idp-adapter';
import DataService from '../data/service';
import { GET_PROFILES_BY_STAMBOEK } from './queries.gql';
import _ from 'lodash';
import { StamboekValidationStatuses } from './route';

interface GetProfilesByStamboekResponse {
	data: {
		users_profiles: any[];
	};
}

export default class StamboekController {

	/**
	 * Verify the stamboek number against the api of klasse
	 * @param stamboekNumber
	 */
	public static async validate(stamboekNumber: string): Promise<StamboekValidationStatuses> {
		try {
			// Check if valid stamboek number through external klasse api
			if (stamboekNumber === '97436428856') { // allow debug stamboek number to be used multiple times for testing purposes
				return 'VALID';
			}
			const isValid = await StamboekService.validate(stamboekNumber);
			if (isValid) {
				// check if already in use in our local db
				const response: GetProfilesByStamboekResponse = await DataService.execute(GET_PROFILES_BY_STAMBOEK, { stamboekNumber });
				const profiles: any[] = _.get(response, 'data.users_profiles');
				if (profiles && profiles.length === 0) {
					return 'VALID';
				}
				return 'ALREADY_IN_USE';
			}
			return 'INVALID';
		} catch (err) {
			throw new InternalServerError('Failed to validate the provided stamboek number', err, { stamboekNumber });
		}
	}
}
