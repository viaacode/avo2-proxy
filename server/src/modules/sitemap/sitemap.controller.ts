import moment from 'moment';

import CollectionsService from '../collections/collections.service';
import ContentPageService from '../content-pages/service';

import { SitemapItemInfo } from './sitemap.types';

export default class SitemapController {
	public static async generateSitemap(): Promise<string> {
		const staticPages = [
			'/',
			'/login',
			'/stamboek',
			'/manuele-toegangsaanvraag',
			'/student-leerkracht',
			'/registreer-of-login',
			'/accepteer-voorwaarden',
			'/cookiebeleid',
			'/gebruiker-item-aanvraag',
		];

		const [contentPages, collections] = await Promise.all([
			ContentPageService.fetchPublicContentPages(),
			CollectionsService.fetchPublicCollectionUuids(),
		]);

		const allPages: SitemapItemInfo[] = [
			...staticPages.map(path => ({
				loc: process.env.CLIENT_HOST + path,
				changefreq: 'monthly',
			})),
			...contentPages.map(contentPage => ({
				loc: process.env.CLIENT_HOST + contentPage.path,
				changefreq: 'weekly',
				lastmod: moment(contentPage.updated_at).format('YYYY-MM-DD'),
			})),
			...collections.map(collection => ({
				loc: `${process.env.CLIENT_HOST}/${
					collection.type_id === 3 ? 'collecties' : 'bundels'
				}/${collection.id}`,
				changefreq: 'weekly',
				lastmod: moment(collection.updated_at).format('YYYY-MM-DD'),
			})),
		];

		return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages.map(SitemapController.renderPage).join('\n')}
</urlset>
`;
	}

	private static renderPage(pageInfo: SitemapItemInfo): string {
		return `<url>
  <loc>${pageInfo.loc}</loc>
  ${pageInfo.lastmod ? `<lastmod>${pageInfo.lastmod}</lastmod>` : ``}
  <changefreq>${pageInfo.changefreq}</changefreq>
</url>`;
	}
}
