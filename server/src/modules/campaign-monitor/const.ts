import { keys } from 'lodash';

import { NewsletterList } from './types';

export const NEWSLETTER_LISTS = {
	newsletter: process.env.CAMPAIGN_MONITOR_NEWSLETTER_LIST_ID,
	ambassador: process.env.CAMPAIGN_MONITOR_AMBASSADOR_LIST_ID,
	workshop: process.env.CAMPAIGN_MONITOR_WORKSHOP_LIST_ID,
};

export const NEWSLETTER_LISTS_TO_FETCH = keys(NEWSLETTER_LISTS) as NewsletterList[];
