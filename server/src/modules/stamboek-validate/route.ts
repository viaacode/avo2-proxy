import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import StamboekController from './controller';

@Path('/stamboek')
export default class StamboekRoute {
	@Context
	context: ServiceContext;

	/**
	 * Checks if a stamboek number is valid by querying the klasse stamboek api: https://api.klasse.be/lk/nr
	 * @param stamboekNumber number of 11 digits identifying an educator
	 */
	@Path('validate')
	@GET
	async verifyStamboekNumber(
		@QueryParam('stamboekNumber') stamboekNumber: string
	): Promise<Avo.Stamboek.ValidateResponse> {
		// Check inputs
		if (!stamboekNumber) {
			throw new BadRequestError('query param stamboekNumber is required');
		}

		// Execute controller
		try {
			return {
				status: await StamboekController.validate(stamboekNumber),
			};
		} catch (err) {
			const error = new InternalServerError('Failed during validate stamboek route', err, {
				stamboekNumber,
			});
			logger.error(error);
			throw error;
		}
	}
}
