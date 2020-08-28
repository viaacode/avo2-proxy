import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { ExternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';

import MamSyncratorController from './mam-syncrator.controller';

@Path('/mam-syncrator')
export default class MamSyncratorRoute {
	@Context
	context: ServiceContext;

	/**
	 * Trigger delta sync to copy video and audio items from the MAM archive to the AvO shared.items table
	 *
	 * Whenever you make a call twice if a job is already running or starting
	 * you will get back the job_id of that call instead of creating a new one.
	 * In all other cases you will create a new job.
	 */
	@Path('trigger-delta-sync')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	public async triggerDeltaSync(): Promise<string | null> {
		try {
			return MamSyncratorController.triggerDeltaSync();
		} catch (err) {
			logger.error(err);
			throw new ExternalServerError(err.message);
		}
	}
}
