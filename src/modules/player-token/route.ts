import { Context, Path, ServiceContext, QueryParam, GET } from 'typescript-rest';
import { RecursiveError } from '../../helpers/recursiveError';
import AuthController from '../auth/controller';
import { UnauthorizedError } from 'typescript-rest/dist/server/model/errors';
import PlayerTokenController from './controller';
import * as _ from 'lodash';
import * as util from 'util';
const publicIp = require('public-ip');

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
		@QueryParam('externalId') externalId: string,
	): Promise<any> {
		if (!externalId) {
			throw new RecursiveError('query param externalId is required');
		}
		try {
			// if (AuthController.isAuthenticated(this.context.request)) {
				return await PlayerTokenController.getToken(
					externalId,
					await PlayerTokenRoute.getIp(this.context),
					this.context.request.header('Referer') || 'http://localhost:8080/',
					8 * 60 * 60 * 1000,
				);
			// } else {
			// 	return new UnauthorizedError('You must be logged in to get a player token');
			// }
		} catch (err) {
			const error = new RecursiveError('Failed during get player token route', err, {});
			console.error(util.inspect(error));
			throw util.inspect(error);
		}
	}

	private static async getIp(context): Promise<string> {
		const ip = context.request.ip;
		if (ip === '::1') {
			// Localhost request (local development) => get external ip of the developer machine
			return publicIp.v4();
		} else {
			return ip;
		}
	}
}
