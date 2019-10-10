import { Context, Path, ServiceContext, POST, PreProcessor } from 'typescript-rest';
import VideoStillsController, { StillInfo } from './controller';
import * as util from 'util';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
import { StillRequest, stillRequestValidation } from './validation';
import { ValidationResult } from '@hapi/joi';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

@Path('/video-stills')
export default class VideoStillsRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get the first video still for each external id after the provided start time
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticated)
	async getVideoStills(stillRequests: StillRequest[]): Promise<StillInfo[]> {
		// Check inputs
		if (!stillRequests || !stillRequests.length) {
			throw new BadRequestError('No still requests were passed to the video-stills route');
		}
		const validationResult: ValidationResult<StillRequest[]> = stillRequestValidation.validate(stillRequests);
		if (validationResult.error) {
			throw new BadRequestError(`The still requests array doesn't have the expected format.
			${JSON.stringify(validationResult.error.details, null, 2)}`);
		}

		// Execute controller
		try {
			return await VideoStillsController.getFirstVideoStills(stillRequests);
		} catch (err) {
			const error = new CustomError('Failed during get video stills route', err, { stillRequests });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
