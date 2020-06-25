import { keys } from 'lodash';

import { NewsletterKey } from './types';

export const NEWSLETTER_LISTS = {
	newsletter: process.env.CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID,
	ambassador: process.env.CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID,
	workshop: process.env.CAMPAIGN_MONITOR_WORKSHOP_LIST_ID,
	allActiveUsers: process.env.CAMPAIGN_MONITOR_ALL_ACTIVE_USERS_LIST_ID,
};

export const NEWSLETTERS_TO_FETCH = keys(NEWSLETTER_LISTS) as NewsletterKey[];

export const templateIds = {
	item: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_ITEM,
	collection: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_COLLECTION,
	bundle: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_BUNDLE,
};
