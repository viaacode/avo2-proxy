import axios, { AxiosResponse } from 'axios';

import { toMilliseconds } from '../../shared/helpers/duration';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { InternalServerError } from '../../shared/helpers/error';

export interface VideoStill {
	time: number;
	previewImagePath: string;
	thumbnailImagePath: string;
}

export interface VideoStillRaw {
	absoluteTimecode: string;
	relativeTimecode: string;
	previewImagePath: string;
	thumbnailImagePath: string;
}

checkRequiredEnvs([
	'VIDEO_STILLS_ENDPOINT',
]);

export default class VideoStillsService {
	/**
	 * Get a the video stills from the media server for the specified video path id
	 * https://viaadocumentation.atlassian.net/wiki/spaces/AVO2/pages/1056997395/Request+stills+for+item
	 * @param objectId
	 */
	public static async getVideoStills(objectId: string): Promise<VideoStill[]> {
		let url: string;
		try {
			if (!process.env.VIDEO_STILLS_ENDPOINT) {
				throw new InternalServerError(
					'VIDEO_STILLS_ENDPOINT env variable is not set',
					null,
					{ VIDEO_STILLS_ENDPOINT: process.env.VIDEO_STILLS_ENDPOINT }
				);
			}
			url = `${process.env.VIDEO_STILLS_ENDPOINT}/${objectId}/keyframes`;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'get',
				headers: {
					Authorization: `Basic ${process.env.VIDEO_STILLS_AUTHORIZATION_TOKEN}`,
				},
			});
			const videoStills: VideoStillRaw[] = response.data;
			return videoStills.map((videoStill: VideoStillRaw): VideoStill => {
				return {
					thumbnailImagePath: videoStill.thumbnailImagePath,
					previewImagePath: videoStill.previewImagePath,
					time: toMilliseconds(videoStill.absoluteTimecode) || 0,
				};
			});
		} catch (err) {
			throw new InternalServerError(
				'Failed to get player-token from player-token service',
				err,
				{
					url,
				});
		}
	}
}
