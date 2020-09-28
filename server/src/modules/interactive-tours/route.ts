import _ from 'lodash';
import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { IdpHelper } from '../auth/idp-helper';

import InteractiveTourController from './controller';

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
			const error = new InternalServerError('Failed to get interactive tour route ids', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}

	@Path('tour')
	@GET
	async getInteractiveTourByRouteId(@QueryParam('routeId') routeId: string): Promise<Avo.InteractiveTour.InteractiveTour | null> {
		try {
			const user = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			return await InteractiveTourController.getInteractiveTour(routeId, _.get(user, 'profile.id'));
		} catch (err) {
			const error = new InternalServerError('Failed to get interactive tour by routeId', err, { routeId });
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
