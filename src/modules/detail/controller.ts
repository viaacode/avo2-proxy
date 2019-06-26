import { DetailResponse } from './types';
import { RecursiveError } from '../../helpers/recursiveError';
import DetailService from './service';

export default class DetailController {

	public static async get(id: string): Promise<DetailResponse> {
		try {
			return await DetailService.get(id);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to get detail, are you connected to the VIAA VPN?',
					err,
					{ id }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to get detail',
					err,
					{ id });
			}
		}
	}
}
