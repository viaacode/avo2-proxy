import * as fs from 'fs-extra';
import * as path from 'path';
import replaceAll from 'string.prototype.replaceall';
import { Context, GET, Path, QueryParam, ServiceContext } from 'typescript-rest';

@Path('/not-found')
export default class NotFoundRoute {
	@Context
	context: ServiceContext;

	private notFoundHtml: string;

	/**
	 * Returns a static 404 page that resembles the avo page with a true 404 status code
	 */
	@Path('/')
	@GET
	async serve404Page(@QueryParam('message') message: string): Promise<void> {
		if (!this.notFoundHtml) {
			this.notFoundHtml = (
				await fs.readFile(path.resolve('src/modules/not-found/404.html'))
			).toString('utf-8');
			this.notFoundHtml = replaceAll(
				this.notFoundHtml,
				'{{client-url}}',
				process.env.CLIENT_HOST
			);
		}
		this.context.response.status(404);
		this.context.response.setHeader('Content-Type', 'text/html');
		this.context.response.send(
			this.notFoundHtml.replace(
				'{{message}}',
				message || 'Oeps. Deze pagina is niet toegankelijk.'
			)
		);
	}
}
