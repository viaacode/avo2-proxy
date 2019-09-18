import { CustomError } from '../../shared/helpers/error';
import StamboekService from './service';

export default class VideoStillsController {

	/**
	 * Verify the stamboek number against the api of klasse
	 * @param stamboekNumber
	 */
	public static async validate(stamboekNumber: string): Promise<boolean> {
		try {
			return await StamboekService.validate(stamboekNumber);
		} catch (err) {
			throw new CustomError('Failed to validate the provided stamboek number', err, { stamboekNumber });
		}
	}
}
