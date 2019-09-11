import VideoStillsService, { VideoStill } from './service';
import DataService from '../data/service';
import { GET_ITEMS_BY_IDS } from './queries.gql';
import * as _ from 'lodash';
import { CustomError } from '@shared/helpers/error';
import { logger } from '@shared/helpers/logger';
import * as promiseUtils from 'blend-promise-utils';

export default class VideoStillsController {

	/**
	 * Get a number of video stills for the specified items
	 * @param externalIds: external_ids of the items you want stills for
	 * @param numberOfStills only return a specific number of stills, if you pass 0, you'll get all stills for all passed externalIds
	 */
	public static async getVideoStills(externalIds: string[], numberOfStills: number): Promise<VideoStill[]> {
		try {
			// Get browse paths for all items
			const response = await DataService.execute(GET_ITEMS_BY_IDS, { ids: externalIds });
			if (response.errors) {
				throw new CustomError(
					'Failed to lookup item info from graphql',
					null,
					{ externalIds, numberOfStills, errors: response.errors }
				);
			}
			const browsePaths: string[] = _.get(response, 'data.app_item_meta', []).map((item: any) => item.browse_path);

			// Extract object name from the browse path
			const objectNames: string[] = _.compact(browsePaths.map((browsePath: string) => {
				const parts = browsePath.split('/');
				parts.pop(); // strip browse.mp4
				return parts.pop(); // Return browse_path id
			}));

			// Only request stills for as many videos as we need
			const slicedObjectNames = objectNames.slice(0, Math.min(objectNames.length, numberOfStills || objectNames.length));

			// Get stills for all videos
			const allVideoStillsWithNull: (VideoStill[] | null)[] = await promiseUtils.mapLimit(slicedObjectNames, 20, this.getVideoStillsWithLogging);
			const allVideoStills: VideoStill[][] = _.compact(allVideoStillsWithNull);

			// If all stills are requested, return all stills
			const flattenStills = _.flatten(allVideoStills);
			if (numberOfStills === 0) {
				return flattenStills;
			}

			// If a limited number of stills are requested, get one still from every video and repeat until
			// we have the requested number of stills or if we run out of stills
			const itemsToTake = Math.min(numberOfStills, flattenStills.length);
			let arrayIndex = 0;
			const pickedStills: VideoStill[] = [];
			while (pickedStills.length < itemsToTake) {
				const still = allVideoStills[arrayIndex].shift();
				if (still) {
					pickedStills.push(still);
				}
				arrayIndex = (arrayIndex + 1) % allVideoStills.length;
			}
			return pickedStills;
		} catch (err) {
			throw new CustomError('Failed to get stills in video stills controller', err, { externalIds, numberOfStills });
		}
	}

	private static async getVideoStillsWithLogging(objectName: string): Promise<VideoStill[] | null> {
		try {
			return await VideoStillsService.getVideoStills(objectName);
		} catch (err) {
			logger.error(new CustomError('Failed to get video stills for objectName', err, { objectName }));
			return null; // Avoid failing on a single error, so the other stills still get returned, We'll just log the error
		}
	}
}
