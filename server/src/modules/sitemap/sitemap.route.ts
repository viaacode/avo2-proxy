import { Context, GET, Path, Return, ServiceContext } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import SitemapController from './sitemap.controller';

@Path('/sitemap')
export default class SitemapRoutes {
	@Context
	context: ServiceContext;

	@Path('/')
	@GET
	async generateSitemap(): Promise<Return.DownloadBinaryData> {
		try {
			return new Return.DownloadBinaryData(
				new Buffer(await SitemapController.generateSitemap()),
				'text/xml',
				'sitemap.xml'
			);
		} catch (err) {
			const error = new InternalServerError('Failed to generate the sitemap', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
