import { Context, GET, Path, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';

import NavigationItemsController from './controller';

@Path('/navigation')
export default class NavigationItemsRoute {
	@Context
	context: ServiceContext;

	/**
	 * Get navigation items for the current user (logged in or not logged in)
	 */
	@Path('items')
	@GET
	async getNavigationItems(): Promise<any> {
		try {
			return await NavigationItemsController.getNavigationItems(this.context.request);
		} catch (err) {
			throw new InternalServerError('Failed to get navigation items', err);
		}
	}
}
