import { Context, GET, Path, POST, PreProcessor, QueryParam, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError, NotFoundError, UnauthorizedError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import ContentPageController from './controller';

@Path('/content-pages')
export default class ContentPagesRoute {
	@Context
	context: ServiceContext;

	@Path('')
	@GET
	async getContentPageByPath(@QueryParam('path') path: string): Promise<Avo.ContentPage.Page> {
		let content: Avo.ContentPage.Page = null;
		try {
			const user: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			content = await ContentPageController.getContentPageByPath(path, user);
		} catch (err) {
			logger.error(new InternalServerError('Failed to get content page', err));
			throw new InternalServerError('Failed to get content page', null, { path });
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

	/**
	 * Resolves the objects (items, collections, bundles, search queries) that are references inside the media grid blocks to their actual objects
	 * @param body
	 * @Return Promise<any[]>: the media grid blocks with their content stored under the results property
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticated)
	async resolveMediaGridBlocks(body: {
		searchQuery: string | undefined;
		searchQueryLimit: string | undefined;
		mediaItems: {
			mediaItem: {
				type: 'ITEM' | 'COLLECTION' | 'BUNDLE',
				value: string
			}
		}[] | undefined;
	}): Promise<any[]> {
		try {
			const user = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			if (!user.profile.permissions.includes('SEARCH')) {
				throw new UnauthorizedError('You do not have the required permission for this route');
			}
			return await ContentPageController.resolveMediaTileItems(body.searchQuery, body.searchQueryLimit, body.mediaItems);
		} catch (err) {
			throw new NotFoundError(
				'Something went wrong while resolving the media grid blocks',
				err,
				{ body }
			);
		}
	}
}
