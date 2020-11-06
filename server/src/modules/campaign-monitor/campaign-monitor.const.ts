import { keys } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

export const NEWSLETTER_LISTS = {
	newsletter: process.env.CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID,
	ambassador: process.env.CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID,
	workshop: process.env.CAMPAIGN_MONITOR_WORKSHOP_LIST_ID,
	allActiveUsers: process.env.CAMPAIGN_MONITOR_ALL_ACTIVE_USERS_LIST_ID,
};

export const NEWSLETTERS_TO_FETCH = keys(NEWSLETTER_LISTS) as Avo.Newsletter.PreferencesKey[];

export const templateIds = {
	item: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_ITEM,
	collection: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_COLLECTION,
	bundle: process.env.CAMPAIGN_MONITOR_EMAIL_TEMPLATE_SHARE_BUNDLE,
};

export const BULK_UPDATE_BATCH_SIZE = 1000;
