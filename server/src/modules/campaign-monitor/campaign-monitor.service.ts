import axios, { AxiosResponse } from 'axios';
import * as promiseUtils from 'blend-promise-utils';
import { get, isEmpty, isNil, isString, keys, toPairs, values } from 'lodash';
import * as queryString from 'query-string';

import type { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import DataService from '../data/data.service';

import { NEWSLETTER_LISTS, NEWSLETTERS_TO_FETCH, templateIds } from './campaign-monitor.const';
import { COUNT_ACTIVE_USERS, GET_ACTIVE_USERS, HAS_CONTENT } from './campaign-monitor.gql';
import { CmUserInfo, CustomFields, EmailInfo, HasContent } from './campaign-monitor.types';

checkRequiredEnvs([
	'CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT',
	'CAMPAIGN_MONITOR_API_ENDPOINT',
	'CAMPAIGN_MONITOR_API_KEY',
	'CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID',
	'CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID',
	'CAMPAIGN_MONITOR_WORKSHOP_LIST_ID',
	'CAMPAIGN_MONITOR_ALL_ACTIVE_USERS_LIST_ID',
	'CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_ITEM',
	'CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_COLLECTION',
	'CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_BUNDLE',
	'CAMPAIGN_MONITOR_EMAIL_TEMPLATE_BLOCK_USER',
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
			url = `${
				process.env.CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT
			}/${listId}.json/?${queryString.stringify({ email })}`;
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
			const responses: boolean[] = await axios.all(
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
				`${process.env.CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT}/${listId}/unsubscribe.json`,
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

	private static getCmSubscriberData(cmUserInfo: CmUserInfo, resubscribe: boolean) {
		return {
			EmailAddress: cmUserInfo.email,
			Name: cmUserInfo.name,
			Resubscribe: resubscribe,
			ConsentToTrack: resubscribe ? 'Yes' : 'Unchanged',
			CustomFields: toPairs(cmUserInfo.customFields).map((pair) => ({
				Key: pair[0],
				Value: pair[1],
				Clear: isNil(pair[1]) || (isString(pair[1]) && pair[1] === ''),
			})),
		};
	}

	public static async subscribeToNewsletterList(listId: string, cmUserInfo: CmUserInfo) {
		try {
			if (!cmUserInfo.email) {
				return;
			}

			const data = this.getCmSubscriberData(cmUserInfo, true);

			await axios(`${process.env.CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT}/${listId}.json`, {
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
			throw new CustomError('Failed to subscribe to newsletter list', err, {
				listId,
				cmUserInfo,
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
				`${
					process.env.CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT
				}/${listId}.json?${queryString.stringify({ email: oldEmail })}`,
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

	private static getWhere(activeDate: string): any {
		let where = {};
		if (activeDate) {
			where = {
				_or: [
					{
						updated_at: {
							_gt: activeDate,
						},
					},
					{
						profile: {
							updated_at: {
								_gt: activeDate,
							},
						},
					},
				],
			};
		}
		return where;
	}

	/**
	 * Gets users from the database where their active date is past the provided date
	 * @param activeDate when you pass null, all users will be returned
	 * @param offset used for pagination
	 * @param limit used for pagination
	 */
	static async getActiveUsers(
		activeDate: string | null,
		offset: number,
		limit: number
	): Promise<Avo.User.User[]> {
		try {
			const response = await DataService.execute(GET_ACTIVE_USERS, {
				offset,
				limit,
				where: CampaignMonitorService.getWhere(activeDate),
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}

			return get(response, 'data.shared_users') || [];
		} catch (err) {
			throw new CustomError('Failed to get active users from the database', err, {
				activeDate,
				query: GET_ACTIVE_USERS,
			});
		}
	}

	static async countActiveUsers(activeDate: string | null): Promise<number> {
		try {
			const response = await DataService.execute(COUNT_ACTIVE_USERS, {
				where: CampaignMonitorService.getWhere(activeDate),
			});

			if (response.errors) {
				throw new CustomError('graphql response contains errors', null, {
					response,
				});
			}

			return get(response, 'data.shared_users_aggregate.aggregate.count') || 0;
		} catch (err) {
			throw new CustomError('Failed to count active users from the database', err, {
				activeDate,
				query: COUNT_ACTIVE_USERS,
			});
		}
	}

	static async bulkUpdateSubscriberInfo(userInfos: CmUserInfo[]) {
		try {
			const listIds = values(NEWSLETTER_LISTS);
			for (const listId of listIds) {
				const subscriberInfos = userInfos.map((userInfo) =>
					this.getCmSubscriberData(userInfo, false)
				);
				const data = {
					Subscribers: subscriberInfos,
					Resubscribe: false,
				};
				const url = `${process.env.CAMPAIGN_MONITOR_SUBSCRIBERS_ENDPOINT}/${listId}/import.json`;
				await axios(url, {
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
			}
		} catch (err) {
			const responseData = get(err, 'response.data');
			if (JSON.stringify(responseData).includes('Subscriber Import had some failures')) {
				// Do not log errors regarding users not being updated when they are in the unsubscribe list
				const seriousErrors = get(responseData, 'ResultData.FailureDetails', []).filter(
					(error: any) => error.Code !== 206
				);
				if (seriousErrors.length) {
					logger.error(
						new CustomError('Failed to import some users into CM', err, {
							responseData,
						})
					);
				}
				return;
			}
			throw new CustomError('Failed to bulk update subscriber info in campaign monitor', err);
		}
	}
}
