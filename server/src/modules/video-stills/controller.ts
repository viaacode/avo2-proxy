import * as promiseUtils from 'blend-promise-utils';
import { compact, find, get, last } from 'lodash';

import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import DataService from '../data/data.service';

import { GET_ITEM_PIDS_AND_BROWSE_PATHS_BY_IDS } from './queries.gql';
import VideoStillsService, { VideoStill } from './service';
import { StillRequest } from './validation';

export interface StillInfo {
	// TODO move this interface to types repo
	previewImagePath: string;
	thumbnailImagePath: string;
}

interface ObjectNameInfo {
	externalId: string;
	objectName: string;
	startTime: number;
}

interface ObjectNameInfoAndStills {
	externalId: string;
	objectName: string;
	startTime: number;
	videoStills: VideoStill[];
}

export default class VideoStillsController {
	/**
	 * Get the first video still after the provided start times for all provided videos
	 * @param stillRequests: list of info objects containing the video id and their desired start time
	 */
	public static async getFirstVideoStills(stillRequests: StillRequest[]): Promise<StillInfo[]> {
		try {
			// Get browse paths for all items
			const ids: string[] = stillRequests.map(
				(stillRequest: StillRequest) => stillRequest.externalId
			);
			const response = await DataService.execute(GET_ITEM_PIDS_AND_BROWSE_PATHS_BY_IDS, { ids });

			if (response.errors) {
				throw new InternalServerError('Failed to lookup item info from graphql', null, {
					stillRequests,
					errors: response.errors,
				});
			}
			const items = get(response, 'data.app_item_meta', []);

			const objectNameInfos: ObjectNameInfo[] = items.map(
				(item: { external_id: string; browse_path: string }) => ({
					externalId: item.external_id,
					objectName: this.extractObjectName(item.browse_path),
					startTime: find(
						stillRequests,
						(stillRequest: StillRequest) => stillRequest.externalId === item.external_id
					).startTime,
				})
			);

			// Get stills for all videos
			const allVideoStills: ObjectNameInfoAndStills[] = compact(
				await promiseUtils.mapLimit(objectNameInfos, 20, this.getVideoStillsWithLogging)
			);

			// Get first video still for each video after their startTime
			return compact(
				allVideoStills.map((objectNameInfo: ObjectNameInfoAndStills): StillInfo | null => {
					const firstVideoStill = find(
						objectNameInfo.videoStills,
						(videoStill: VideoStill) => videoStill.time > objectNameInfo.startTime
					);

					if (!firstVideoStill) {
						return last(objectNameInfo.videoStills) || null;
					}
					return {
						previewImagePath: firstVideoStill.previewImagePath,
						thumbnailImagePath: firstVideoStill.thumbnailImagePath,
					};
				})
			);
		} catch (err) {
			throw new InternalServerError('Failed to get stills in video stills controller', err, {
				stillRequests,
			});
		}
	}

	private static async getVideoStillsWithLogging(
		objectNameInfo: ObjectNameInfo
	): Promise<(ObjectNameInfo & { videoStills: VideoStill[] }) | null> {
		try {
			return {
				...objectNameInfo,
				videoStills: await VideoStillsService.getVideoStills(objectNameInfo.objectName),
			};
		} catch (err) {
			logger.error(
				new InternalServerError('Failed to get video stills for objectName', err, {
					objectNameInfo,
				})
			);
			return null; // Avoid failing on a single error, so the other stills still get returned, We'll just log the error
		}
	}

	private static extractObjectName(browsePath: string) {
		return browsePath
			.split(/(\/keyframes|\/browse)/g)[0]
			.split('/')
			.pop();
	}
}
