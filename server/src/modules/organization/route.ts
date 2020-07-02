import { Path, POST, PreProcessor } from 'typescript-rest';

import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkApiKeyRouteGuard } from '../../shared/middleware/is-authenticated';

import OrganisationService from './service';

@Path('/organisations')
export default class OrganisationsRoute {
	@Path('update-cache')
	@POST
	@PreProcessor(checkApiKeyRouteGuard)
	async updateOrganisationsCache(): Promise<any> {
		try {
			await OrganisationService.updateOrganisationsCache();
			return { message: 'cache has been updated successfully' };
		} catch (err) {
			logger.error(new CustomError('Failed to update organisations cache', err));
		}
	}
}
