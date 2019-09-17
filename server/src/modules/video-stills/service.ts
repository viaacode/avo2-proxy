import axios, { AxiosResponse } from 'axios';
import { CustomError } from '../../shared/helpers/error';

export interface VideoStill { // TODO replace with interface from avo2-types when we release v1.7.0
	absoluteTimecode: string;
	relativeTimecode: string;
	previewImagePath: string;
	thumbnailImagePath: string;
}

if (!process.env.VIDEO_STILLS_ENDPOINT) {
	throw new CustomError('Environment variable VIDEO_STILLS_ENDPOINT has to be filled in');
}

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
				throw new CustomError(
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
			return response.data;
		} catch (err) {
			throw new CustomError(
				'Failed to get player-token from player-token service',
				err,
				{
					url,
				});
		}
	}
}
