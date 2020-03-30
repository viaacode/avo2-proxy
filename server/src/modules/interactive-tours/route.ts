import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';

import InteractiveTourController from './controller';
import { IdpHelper } from '../auth/idp-helper';
import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';

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
	async getInteractiveTourByRouteId(@QueryParam('routeId') routeId: string): Promise<Avo.InteractiveTour.InteractiveTour | null> {
		try {
			const user = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			return await InteractiveTourController.getInteractiveTour(routeId, _.get(user, 'profile.id'));
		} catch (err) {
			throw new InternalServerError('Failed to get interactive tour by routeId', err, { routeId });
		}
	}
}
