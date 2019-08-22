import { Context, Path, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import AuthController from '../auth/controller';
import { UnauthorizedError } from 'typescript-rest/dist/server/model/errors';
import PlayerTokenController from './controller';
import * as _ from 'lodash';

@Path('/player-token')
export default class PlayerTokenRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get a player token to be able to play a video for a limited amount of time
	 */
	@Path('')
	@GET
	async getToken(
		@QueryParam('urlToVideo') urlToVideo: string,
	): Promise<any> {
		try {
			if (AuthController.isAuthenticated(this.context.request)) {
				return await PlayerTokenController.getToken(
					urlToVideo,
					this.context.request.ip,
					_.get(this.context.request, 'useragent.source', ''),
					8 * 60 * 60 * 1000,
				);
			} else {
				return new UnauthorizedError('You must be logged in to get a player token');
			}
		} catch (err) {
			const error = new RecursiveError('Failed during get player token route', err, {});
			console.error(error.toString());
			throw error;
		}
	}
}
