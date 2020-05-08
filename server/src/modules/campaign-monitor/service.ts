import axios, { AxiosResponse } from 'axios';
import { get } from 'lodash';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { CustomError } from '../../shared/helpers/error';

import { NEWSLETTER_LISTS, NEWSLETTERS_TO_FETCH } from './const';
import { EmailInfo, templateIds } from './route';

checkRequiredEnvs([
	'CAMPAIGN_MONITOR_API_ENDPOINT',
	'CAMPAIGN_MONITOR_API_KEY',
	'CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID',
	'CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID',
	'CAMPAIGN_MONITOR_WORKSHOP_LIST_ID',
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

			await axios(url, {
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

	public static async fetchNewsletterPreference(listId: string, email: string) {
		try {
			const response: AxiosResponse<any> = await axios(
				`https://api.createsend.com/api/v3.2/subscribers/${listId}.json?email=${email}`,
				{
					method: 'GET',
					auth: {
						username: process.env.CAMPAIGN_MONITOR_API_KEY,
						password: '.',
					},
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			return get(response, 'data.State') === 'Active';
		} catch (err) {
			if (err.response.data.Code === 203) {
				return false;
			}

			throw new CustomError('Failed to retrieve newsletter preference', err, { listId, email });
		}
	}

	public static async fetchNewsletterPreferences(email: string) {
		try {
			const responses = await axios.all(NEWSLETTERS_TO_FETCH.map((list => this.fetchNewsletterPreference(NEWSLETTER_LISTS[list], email))));

			return {
				newsletter: responses[0],
				ambassador: responses[1],
				workshop: responses[2],
			};
		} catch (err) {
			throw new CustomError('Failed to retrieve newsletter preferences', err, { email });
		}
	}

	public static async unsubscribeFromNewsletterList(listId: string, email: string) {
		try {
			await axios(
				`https://api.createsend.com/api/v3.2/subscribers/${listId}/unsubscribe.json`,
				{
					method: 'POST',
					auth: {
						username: process.env.CAMPAIGN_MONITOR_API_KEY,
						password: '.',
					},
					headers: {
						'Content-Type': 'application/json',
					},
					data: {
						EmailAddress: email,
					},
				}
			);
		} catch (err) {
			throw new CustomError('Failed to unsubscribe from newsletter list', err, { email });
		}
	}

	public static async subscribeFromNewsletterList(listId: string, name: string, email: string) {
		try {
			await axios(
				`https://api.createsend.com/api/v3.2/subscribers/${listId}.json`,
				{
					method: 'POST',
					auth: {
						username: process.env.CAMPAIGN_MONITOR_API_KEY,
						password: '.',
					},
					headers: {
						'Content-Type': 'application/json',
					},
					data: {
						EmailAddress: email,
						Name: name,
						Resubscribe: true,
						ConsentToTrack: 'Yes',
					},
				}
			);
		} catch (err) {
			throw new CustomError('Failed to subscribe from newsletter list', err, { listId, name, email });
		}
	}
}
