import { Context, Path, ServiceContext, QueryParam, GET } from 'typescript-rest';
import PlayerTicketController from './controller';
import * as util from 'util';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '@shared/helpers/logger';
import { CustomError } from '@shared/helpers/error';

const publicIp = require('public-ip');

@Path('/player-ticket')
export default class PlayerTicketRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get a player token to be able to play a video for a limited amount of time
	 */
	@Path('')
	@GET
	async getPlayableUrl(
		@QueryParam('externalId') externalId: string,
	): Promise<any> {
		if (!externalId) {
			throw new BadRequestError('query param externalId is required');
		}
		try {
			// if (AuthController.isAuthenticated(this.context.request)) {
			return await PlayerTicketController.getPlayableUrl(
				externalId,
				await PlayerTicketRoute.getIp(this.context),
				this.context.request.header('Referer') || 'http://localhost:8080/',
				8 * 60 * 60 * 1000,
			);
			// } else {
			// 	return new UnauthorizedError('You must be logged in to get a player token');
			// }
		} catch (err) {
			const error = new CustomError('Failed during get player token route', err, {});
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}

	private static async getIp(context: ServiceContext): Promise<string> {
		const ip = context.request.ip;
		if (ip === '::1') {
			// Localhost request (local development) => get external ip of the developer machine
			return publicIp.v4();
		}
		return ip;
	}
}
