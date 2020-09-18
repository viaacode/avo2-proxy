import axios from 'axios';
import srt2vtt from 'srt-to-vtt';
import { Readable } from 'stream';

import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { streamToString } from '../../shared/helpers/stream-to-string';

export default class SubtitlesController {
	/**
	 * Converts a subtitle to vtt format
	 *
	 * @param subtitleUrl url pointing to the subtitle. This can be a subtitle if srt or vtt format
	 * @return Content of the vtt file as a string
	 */
	static async convertSrtToVtt(subtitleUrl: string): Promise<string> {
		try {
			const response = await axios.get(subtitleUrl);
			if (response.status < 200 || response.status >= 400) {
				throw new ExternalServerError('Failed to fetch srt subtitles', null, { response });
			}
			const subtitleFileContent = response.data;

			if (subtitleUrl.endsWith('vtt')) {
				return subtitleFileContent;
			}

			return await streamToString(Readable.from([subtitleFileContent]).pipe(srt2vtt()));
		} catch (err) {
			throw new InternalServerError('Failed to convert srt subtitle to vtt format', err, {
				srtUrl: subtitleUrl,
			});
		}
	}
}
