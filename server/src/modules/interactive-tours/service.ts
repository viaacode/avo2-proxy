import _ from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import DataService from '../data/service';

import {
	GET_INTERACTIVE_TOUR_ROUTE_IDS, GET_INTERACTIVE_TOUR_WITH_STATUSES, GET_INTERACTIVE_TOUR_WITHOUT_STATUSES,
} from './queries.gql';

export default class InteractiveTourService {
	static async getInteractiveTourRouteIds(): Promise<string[]> {
		try {
			// TODO add better security to only show interactive tours for pages that the user is allowed to access (low priority)
			const response = await DataService.execute(GET_INTERACTIVE_TOUR_ROUTE_IDS);
			if (response.errors) {
				throw new CustomError('Response contains errors', null, { response });
			}
			return _.get(response, 'data.app_interactive_tour', []).map((interactiveTour: Avo.InteractiveTour.InteractiveTour) => interactiveTour.page_id);
		} catch (err) {
			throw new CustomError('Failed to get interactive tour route ids', err, { query: GET_INTERACTIVE_TOUR_ROUTE_IDS });
		}
	}

	static async getInteractiveTour(routeId: string, profileId: string | undefined): Promise<Avo.InteractiveTour.InteractiveTour | null> {
		let response: any;
		let variables: any;
		try {
			if (profileId) {
				// Get tours and seen statuses from the database
				variables = {
					routeId,
					profileId,
					notificationKeyPrefix: `INTERACTIVE-TOUR___${routeId}___%`,
				};

				response = await DataService.execute(GET_INTERACTIVE_TOUR_WITH_STATUSES, variables);
			} else {
				// Only get tours since user is not logged in
				variables = {
					routeId,
				};

				response = await DataService.execute(GET_INTERACTIVE_TOUR_WITHOUT_STATUSES, variables);
			}

			if (response.errors) {
				throw new CustomError('Response contains errors', null, { response });
			}

			return response;
		} catch (err) {
			throw new CustomError(
				'Failed to get interactive tour by route id',
				err,
				{ profileId, variables, query: [GET_INTERACTIVE_TOUR_WITH_STATUSES, GET_INTERACTIVE_TOUR_WITHOUT_STATUSES] }
				);
		}
	}
}
