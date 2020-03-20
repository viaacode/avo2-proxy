import axios, { AxiosResponse } from 'axios';

import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { EmailInfo, templateIds } from './route';

checkRequiredEnvs([
	'CAMPAIGN_MONITOR_API_ENDPOINT',
	'CAMPAIGN_MONITOR_API_KEY',
]);

export default class CampaignMonitorService {
	/**
	 * Send an email using the campaign monitor api
	 * @param info
	 */
	public static async send(info: EmailInfo): Promise<void> {
		let url: string;
		try {
			checkRequiredEnvs(['CAMPAIGN_MONITOR_API_ENDPOINT', 'CAMPAIGN_MONITOR_API_KEY']);
			url = `${process.env.CAMPAIGN_MONITOR_API_ENDPOINT}/${templateIds[info.template]}/send`;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				auth: {
					username: process.env.CAMPAIGN_MONITOR_API_KEY,
					password: '.',
				},
				headers: {
					'Content-Type': 'application/json',
				},
				data: {
					To: [info.to],
					Data: info.data,
					ConsentToTrack: 'unchanged',
				},
			});
		} catch (err) {
			throw new CustomError('Failed to send email using the campaign monitor api', err, { info, url });
		}
	}
}
