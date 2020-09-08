import axios, { AxiosResponse } from 'axios';

import { ExternalServerError } from '../../shared/helpers/error';

export default class MamSyncratorService {
	public static async triggerDeltaSync(): Promise<string> {
		let url: string;
		try {
			url = `${process.env.SYNCRATOR_API}/delta/avo/${process.env.SYNCRATOR_ENV}`;
			const response: AxiosResponse = await axios({
				url,
				method: 'post',
			});
			return response.data.result;
		} catch (err) {
			throw new ExternalServerError('Failed to trigger MAM syncrator delta run', err, {
				url,
			});
		}
	}
}
