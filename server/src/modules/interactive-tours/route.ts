import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';
import { Step } from 'react-joyride';

import { InternalServerError } from '../../shared/helpers/error';

import InteractiveTourController from './controller';
import { IdpHelper } from '../auth/idp-helper';
import _ from 'lodash';

export interface InteractiveTour { // TODO use typings version after update to 2.14.0
	id?: number;
	name: string;
	page_id: string;
	created_at?: string;
	updated_at?: string;
	steps: InteractiveTourStep[];
}

export interface InteractiveTourStep extends Step { // TODO use typings version after update to 2.14.0
	id: string;
}

@Path('/interactive-tours')
export default class InteractiveTourRoute {
	@Context
	context: ServiceContext;

	@Path('route-ids')
	@GET
	async getInteractiveTourRouteIds(): Promise<string[]> {
		try {
			return await InteractiveTourController.getInteractiveTourRouteIds();
		} catch (err) {
			throw new InternalServerError('Failed to get interactive tour route ids', err);
		}
	}

	@Path('tour')
	@GET
	async getInteractiveTourByRouteId(@QueryParam('routeId') routeId: string): Promise<InteractiveTour | null> {
		try {
			const user = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			return await InteractiveTourController.getInteractiveTour(routeId, _.get(user, 'profile.id'));
		} catch (err) {
			throw new InternalServerError('Failed to get interactive tour by routeId', err, { routeId });
		}
	}
}
