import { Context, Path, ServiceContext, QueryParam, GET, PreProcessor } from 'typescript-rest';
import PlayerTicketController from './controller';
import * as util from 'util';
import { BadRequestError } from 'typescript-rest/dist/server/model/errors';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

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
	@PreProcessor(isAuthenticated)
	async getPlayableUrl(
		@QueryParam('externalId') externalId: string,
	): Promise<any> {
		if (!externalId) {
			throw new BadRequestError('query param externalId is required');
		}
		try {
			return await PlayerTicketController.getPlayableUrl(
				externalId,
				await PlayerTicketRoute.getIp(this.context),
				this.context.request.header('Referer') || 'http://localhost:8080/',
				8 * 60 * 60 * 1000,
			);
		} catch (err) {
			const error = new CustomError('Failed during get player token route', err, {});
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}

	private static async getIp(context: ServiceContext): Promise<string> {
		const ip = context.request.headers['X-Forwarded-For'][0] || context.request.ip;

		if (ip === '::1' || ip.includes('::ffff:')) {
			const newIp = publicIp.v4();

			logger.info(`Ticket request ::1 from ip: ${newIp}`);

			// Localhost request (local development) => get external ip of the developer machine
			return newIp;
		}

		return ip;
	}
}
