import { ValidationResult } from '@hapi/joi';
import { Context, Path, POST, ServiceContext } from 'typescript-rest';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import VideoStillsController, { StillInfo } from './controller';
import { StillRequest, stillRequestValidation } from './validation';

@Path('/video-stills')
export default class VideoStillsRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get the first video still for each external id after the provided start time
	 */
	@Path('')
	@POST
	async getVideoStills(stillRequests: StillRequest[]): Promise<StillInfo[]> {
		// Check inputs
		if (!stillRequests || !stillRequests.length) {
			throw new BadRequestError('No still requests were passed to the video-stills route');
		}
		const validationResult: ValidationResult<StillRequest[]> = stillRequestValidation.validate(stillRequests);
		if (validationResult.error) {
			throw new BadRequestError(
				'The still requests array doesn\'t have the expected format',
				null,
				{ validationResult: validationResult.error }
			);
		}

		// Execute controller
		try {
			return await VideoStillsController.getFirstVideoStills(stillRequests);
		} catch (err) {
			const error = new InternalServerError('Failed during get video stills route', err, { stillRequests });
			logger.error(error);
			throw error;
		}
	}
}
