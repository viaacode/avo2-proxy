import { map } from 'lodash';

import CampaignMonitorService from './service';
import { EmailInfo } from './route';
import { NEWSLETTER_LISTS } from './const';
import { NewsletterList } from './types';

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
	 * @param email
	 */
	public static async updateNewsletterPreferences(name: string, email: string, preferences: any) { // TODO: type
		// return CampaignMonitorService.updateNewsletterPreferences(email, preferences);
		const mappedPreferences = map(preferences, (value, key) => ([key, value]));

		mappedPreferences.forEach((preference) => {
			const key: NewsletterList = preference[0];
			const subscribed = preference[1];

			if (subscribed) {
				CampaignMonitorService.subscribeFromNewsletterList(NEWSLETTER_LISTS[key], name, email);
			} else {
				CampaignMonitorService.unsubscribeFromNewsletterList(NEWSLETTER_LISTS[key], email);
			}
		});
	}
}
