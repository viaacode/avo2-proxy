import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError, NotFoundError } from '../../shared/helpers/error';

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

	@Path('content')
	@GET
	async getContentPage(@QueryParam('path') path: string): Promise<Avo.Content.Content> {
		let content: Avo.Content.Content = null;
		try {
			content = await NavigationItemsController.getContentBlockByPath(path, this.context.request);
		} catch (err) {
			throw new InternalServerError('Failed to get navigation items', err);
		}
		if (content) {
			return content;
		}
		throw new NotFoundError(
			'The content page was not found or you do not have rights to see it',
			null,
			{ path }
			);
	}
}
