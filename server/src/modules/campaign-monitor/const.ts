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
	item: '4293ab4f-40a9-47ae-bb17-32edb593c3ba',
	collection: 'f0a7ca5e-63f6-43e7-9bba-8f266a0edb32',
	bundle: '57e3816c-8fda-4d30-8b59-1483d89798f6',
};
