import { toPairs } from 'lodash';

import { NEWSLETTER_LISTS } from './const';
import { EmailInfo } from './route';
import CampaignMonitorService from './service';
import { NewsletterKey, NewsletterPreferences } from './types';

export default class CampaignMonitorController {

	/**
	 * Send an email using the campaign monitor api
	 * @param info
	 */
	public static async send(info: EmailInfo): Promise<void> {
		return CampaignMonitorService.send(info);
	}

	/**
	 * Retrieve email preferences from campaign monitor api
	 * @param email
	 */
	public static async fetchNewsletterPreferences(email: string) {
		return CampaignMonitorService.fetchNewsletterPreferences(email);
	}

	/**
	 * Retrieve email preferences from campaign monitor api
	 * @param name
	 * @param email
	 * @param preferences
	 */
	public static async updateNewsletterPreferences(name: string, email: string, preferences: NewsletterPreferences) {
		const mappedPreferences = toPairs(preferences) as [NewsletterKey, boolean][];

		mappedPreferences.forEach((preference) => {
			const key: NewsletterKey = preference[0];
			const subscribed = preference[1];

			if (subscribed) {
				CampaignMonitorService.subscribeFromNewsletterList(NEWSLETTER_LISTS[key], name, email);
			} else {
				CampaignMonitorService.unsubscribeFromNewsletterList(NEWSLETTER_LISTS[key], email);
			}
		});
	}
}
