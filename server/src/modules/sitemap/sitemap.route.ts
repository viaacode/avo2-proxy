import { Context, GET, Path, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import SitemapController from './sitemap.controller';

@Path('/sitemap.xml')
export default class SitemapRoutes {
	@Context
	context: ServiceContext;

	@Path('/')
	@GET
	async generateSitemap(): Promise<void> {
		try {
			const sitemap = await SitemapController.generateSitemap();
			this.context.response.status(200);
			this.context.response.setHeader('content-type', 'text/xml');
			this.context.response.send(sitemap);
		} catch (err) {
			const error = new InternalServerError('Failed to generate the sitemap', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
