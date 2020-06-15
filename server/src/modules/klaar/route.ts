import { GET, Path } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import KlaarController from './controller';

@Path('/klaar')
export default class KlaarRoute {
	/**
	 * Get json for klaar newsletter by converting contentpage with path /klaar into into a fixed json format
	 */
	@Path('klaar.json')
	@GET
	async getKlaarJson(): Promise<any> {
		try {
			return await KlaarController.getKlaarJson();
		} catch (err) {
			const error = new InternalServerError('Failed to generate klaar newsletter json', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
