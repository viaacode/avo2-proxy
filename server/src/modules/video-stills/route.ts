import { Context, Path, ServiceContext, QueryParam, GET, PreProcessor } from 'typescript-rest';
import VideoStillsController from './controller';
import * as util from 'util';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

@Path('/video-stills')
export default class VideoStillsRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get a player token to be able to play a video for a limited amount of time
	 * @param externalIds can be a single id or a comma separated list of ids
	 * @param numberOfStills limits the number of stills to return,
	 * they are picked one for each video then second for each video until number of requested stills is satiated.
	 * The default is 20
	 */
	@Path('')
	@GET
	@PreProcessor(isAuthenticated)
	async getPlayableUrl(
		@QueryParam('externalIds') externalIds: string,
		@QueryParam('numberOfStills') numberOfStills: number = 20,
	): Promise<any> {
		// Check inputs
		if (!externalIds) {
			throw new BadRequestError('query param externalIds is required');
		}
		const ids: string[] = externalIds.split(',').map((id: string) => id.trim());

		// Execute controller
		try {
			// if (AuthController.isAuthenticated(this.context.request)) {
			return await VideoStillsController.getVideoStills(
				ids,
				numberOfStills,
			);
			// } else {
			// 	return new UnauthorizedError('You must be logged in to get a player token');
			// }
		} catch (err) {
			const error = new CustomError('Failed during get video stills route', err, {externalIds, numberOfStills});
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
