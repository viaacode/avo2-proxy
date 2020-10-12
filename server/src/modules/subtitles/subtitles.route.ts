import { Context, GET, Path, ServiceContext } from 'typescript-rest';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import SubtitlesController from './subtitles.controller';

@Path('/subtitles')
export default class SubtitleRoute {
	@Context
	context: ServiceContext;

	@Path('/convert-srt-to-vtt/*')
	@GET
	async convertSrtToVtt(): Promise<void> {
		try {
			checkRequiredEnvs(['ARCHIEF_MEDIA']);

			const path: string = this.context.request.originalUrl
				.split('/convert-srt-to-vtt/')
				.pop();
			if (!path) {
				throw new BadRequestError(
					'You must specify the srt file path in the url. eg: /subtitles/convert-srt-to-vtt/meemoo/test.srt'
				);
			}
			const subtitleUrl: string = `${process.env.ARCHIEF_MEDIA}/${path}`;
			const vttContent: string = await SubtitlesController.convertSrtToVtt(subtitleUrl);

			this.context.response.status(200);
			this.context.response.setHeader('content-type', 'text/vtt');
			this.context.response.send(vttContent);
		} catch (err) {
			const error = new InternalServerError('Failed to convert the subtitle', err, {
				requestUrl: this.context.request.originalUrl,
			});
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
