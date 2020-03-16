import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError, NotFoundError } from '../../shared/helpers/error';

import ContentPageController from './controller';

@Path('/content-pages')
export default class ContentPagesRoute {
	@Context
	context: ServiceContext;

	@Path('')
	@GET
	async getContentPage(@QueryParam('path') path: string): Promise<Avo.Content.Content> {
		let content: Avo.Content.Content = null;
		try {
			content = await ContentPageController.getContentBlockByPath(path, this.context.request);
		} catch (err) {
			throw new InternalServerError('Failed to get content page', err);
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
