import { Context, GET, Path, PreProcessor, QueryParam, ServiceContext } from 'typescript-rest';
import { Request } from 'express';

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
				await PlayerTicketRoute.getIp(this.context.request),
				this.context.request.header('Referer') || 'http://localhost:8080/',
				8 * 60 * 60 * 1000,
			);
		} catch (err) {
			const error = new InternalServerError('Failed during get player token route', err, {});
			logger.error(error);
			throw error;
		}
	}

	public static async getIp(request: Request): Promise<string> {
		const forwardedFor = request.headers['X-Forwarded-For'] || request.headers['x-forwarded-for'];
		const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || request.ip;

		if (ip.includes('::ffff:')) {
			return ip.replace('::ffff:', '');
		}

		if (ip === '::1') {
			// Localhost request (local development) => get external ip of the developer machine
			return publicIp.v4();
		}

		return ip;
	}
}
