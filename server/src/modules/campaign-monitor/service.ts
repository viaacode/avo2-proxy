import axios, { AxiosResponse } from 'axios';
import * as promiseUtils from 'blend-promise-utils';
import { get, keys, toPairs } from 'lodash';
import * as queryString from 'query-string';

import type { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import DataService from '../data/service';

import { HAS_CONTENT } from './campaign-monitor.gql';
import { NEWSLETTER_LISTS, NEWSLETTERS_TO_FETCH, templateIds } from './const';
import { CustomFields, EmailInfo, HasContent } from './types';

checkRequiredEnvs([
	'CAMPAIGN_MONITOR_API_ENDPOINT',
	'CAMPAIGN_MONITOR_API_KEY',
	'CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID',
	'CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID',
	'CAMPAIGN_MONITOR_WORKSHOP_LIST_ID',
	'CAMPAIGN_MONITOR_ALL_ACTIVE_USERS_LIST_ID',
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
			throw new CustomError('Failed to send email using the campaign monitor api', err, {
				info,
				url,
			});
		}
	}

	public static async fetchNewsletterPreference(listId: string, email: string) {
		let url: string;
		try {
			url = `https://api.createsend.com/api/v3.2/subscribers/${listId}.json?${queryString.stringify(
				{ email }
			)}`;
			const response: AxiosResponse<any> = await axios(url, {
				method: 'GET',
				auth: {
					username: process.env.CAMPAIGN_MONITOR_API_KEY,
					password: '.',
				},
				headers: {
					'Content-Type': 'application/json',
				},
			});

			return get(response, 'data.State') === 'Active';
		} catch (err) {
			if (err.response.data.Code === 203) {
				return false;
			}

			throw new CustomError('Failed to retrieve newsletter preference', err, {
				listId,
				email,
				url,
			});
		}
	}

	public static async fetchNewsletterPreferences(
		email: string
	): Promise<Avo.Newsletter.Preferences> {
		try {
			const responses = await axios.all(
				NEWSLETTERS_TO_FETCH.map((list) =>
					CampaignMonitorService.fetchNewsletterPreference(NEWSLETTER_LISTS[list], email)
				)
			);

			return {
				newsletter: responses[0],
				ambassador: responses[1],
				workshop: responses[2],
				allActiveUsers: responses[3],
			};
		} catch (err) {
			throw new CustomError('Failed to retrieve newsletter preferences', err, { email });
		}
	}

	public static async unsubscribeFromNewsletterList(
		listId: string,
		email: string
	): Promise<void> {
		try {
			if (!email) {
				return;
			}
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

	public static async subscribeToNewsletterList(
		listId: string,
		email: string,
		name: string,
		customFields: CustomFields
	) {
		try {
			if (!email) {
				return;
			}
			const data = {
				EmailAddress: email,
				Name: name,
				Resubscribe: true,
				ConsentToTrack: 'Yes',
				CustomFields: toPairs(customFields).map((pair) => ({
					Key: pair[0],
					Value: pair[1],
				})),
			};

			await axios(`https://api.createsend.com/api/v3.2/subscribers/${listId}.json`, {
				data,
				method: 'POST',
				auth: {
					username: process.env.CAMPAIGN_MONITOR_API_KEY,
					password: '.',
				},
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (err) {
			throw new CustomError('Failed to subscribe from newsletter list', err, {
				listId,
				name,
				email,
			});
		}
	}

	public static async changeEmail(listId: string, oldEmail: string, newEmail: string) {
		try {
			const data = {
				EmailAddress: newEmail,
				ConsentToTrack: 'Unchanged',
			};

			const response = await axios(
				`https://api.createsend.com/api/v3.2/subscribers/${listId}.json?${queryString.stringify(
					{ email: oldEmail }
				)}`,
				{
					data,
					method: 'PUT',
					auth: {
						username: process.env.CAMPAIGN_MONITOR_API_KEY,
						password: '.',
					},
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
			if (response.status < 200 || response.status >= 400) {
				throw new CustomError('Failed to update email in Campaign Monitor', null, {
					listId,
					oldEmail,
					newEmail,
					response: {
						status: response.status,
						statusText: response.statusText,
						data: response.data,
					},
				});
			}
			logger.info('CM account email changed: ', {
				listId,
				oldEmail,
				newEmail,
				response: {
					status: response.status,
					statusText: response.statusText,
					data: response.data,
				},
			});
		} catch (err) {
			if (get(err, 'response.data.Code') === 203) {
				// User not in list or already removed
				return;
			}
			throw new CustomError('Failed to change email in newsletter list', err, {
				listId,
				oldEmail,
				newEmail,
			});
		}
	}

	static async bulkUnsubscribe(emailAddresses: string[]): Promise<void> {
		await promiseUtils.mapLimit(emailAddresses, 10, async (mail: string) => {
			const newsletterListIds = keys(NEWSLETTER_LISTS);
			await Promise.all(
				newsletterListIds.map((listId) => {
					return CampaignMonitorService.unsubscribeFromNewsletterList(listId, mail);
				})
			);
		});
	}

	static async getContentCounts(profileId: string): Promise<HasContent> {
		try {
			const response = await DataService.execute(HAS_CONTENT, {
				profileId,
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}

			return {
				hasPublicCollections: !!get(response, 'data.has_public_collections[0]'),
				hasPrivateCollections: !!get(response, 'data.has_private_collections[0]'),
				hasAssignments: !!get(response, 'data.has_assignments[0]'),
			};
		} catch (err) {
			throw new CustomError('Failed to check if user has content for profile id', err, {
				profileId,
				query: HAS_CONTENT,
			});
		}
	}
}
