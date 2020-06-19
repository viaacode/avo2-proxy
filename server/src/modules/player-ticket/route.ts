import { Context, GET, Path, PreProcessor, QueryParam, ServiceContext } from 'typescript-rest';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';

import PlayerTicketController from './controller';

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
	@PreProcessor(isAuthenticatedRouteGuard)
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
			const error = new InternalServerError('Failed during get player token route', err, {});
			logger.error(error);
			throw error;
		}
	}

	private static async getIp(context: ServiceContext): Promise<string> {
		logger.info('HEADERS', context.request.headers);
		const forwardedFor = context.request.headers['X-Forwarded-For'] || context.request.headers['x-forwarded-for'];
		logger.info('X-FORWARDED-FOR', context.request.headers['X-Forwarded-For']);
		logger.info('x-forwarded-for', context.request.headers['x-forwarded-for']);
		logger.info('CONTEXT.REQ.IP', context.request.ip);
		const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || context.request.ip;

		if (ip.includes('::ffff:')) {
			const newIp = ip.replace('::ffff:', '');

			logger.info(`Ticket request from ip: ${newIp}`);

			return newIp;
		}

		if (ip === '::1') {
			const newIp = publicIp.v4();
			logger.info(`Ticket request ::1 from ip: ${newIp}`);
			// Localhost request (local development) => get external ip of the developer machine
			return publicIp.v4();
		}

		return ip;
	}
}
