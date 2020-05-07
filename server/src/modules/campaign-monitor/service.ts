import axios, { AxiosResponse } from 'axios';

import { CustomError } from '../../shared/helpers/error';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { EmailInfo, templateIds } from './route';
import { NEWSLETTER_LISTS, NEWSLETTER_LISTS_TO_FETCH } from './const';

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

	public static async fetchNewsletterPreferences(email: string) {
		const createRequestUrl = (listId: string) => `https://api.createsend.com/api/v3.2/subscribers/${listId}.json?email=${email}`;
		const createRequest = (listId: string) => {
			return axios(
				createRequestUrl(listId),
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
		};

		try {
			const responses: AxiosResponse[] = await axios.all(NEWSLETTER_LISTS_TO_FETCH.map((list => createRequest(NEWSLETTER_LISTS[list]))));

			const parsedResponse = {
				newsletter: responses[0].data.State === 'Active',
				ambassador: responses[1].data.State === 'Active',
				workshop: responses[2].data.State === 'Active',
			};

			return parsedResponse;
		} catch (err) {
			throw new CustomError('Failed to retrieve newsletter preferences', err);
		}
	}

	public static async unsubscribeFromNewsletterList(listId: string, email: string) {
		const createRequestUrl = (listId: string) => `https://api.createsend.com/api/v3.2/subscribers/${listId}/unsubscribe.json`;

		try {
			const response = await axios(
				createRequestUrl(listId),
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
			throw new CustomError('Failed to unsubscribe from newsletter list', err);
		}
	}

	public static async subscribeFromNewsletterList(listId: string, name: string, email: string) {
		const createRequestUrl = (listId: string) => `https://api.createsend.com/api/v3.2/subscribers/${listId}.json`;

		try {
			await axios(
				createRequestUrl(listId),
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
			throw new CustomError('Failed to subscribe from newsletter list', err);
		}
	}
}
