import { Context, Path, ServiceContext, QueryParam, GET } from 'typescript-rest';
import StamboekController from './controller';
import * as util from 'util';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';

export type StamboekValidationStatuses = 'VALID' | 'ALREADY_IN_USE' | 'INVALID'; // TODO use typings version

export interface ValidateStamboekResponse { // TODO use typings version
	status: StamboekValidationStatuses;
}

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
	): Promise<ValidateStamboekResponse> {
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
			const error = new CustomError('Failed during validate stamboek route', err, { stamboekNumber });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
