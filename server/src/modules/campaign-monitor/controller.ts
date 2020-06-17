import * as promiseUtils from 'blend-promise-utils';
import * as _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { AuthService } from '../auth/service';

import { NEWSLETTER_LISTS } from './const';
import CampaignMonitorService from './service';
import { CustomFields, EmailInfo, NewsletterKey, NewsletterPreferences } from './types';
import EducationOrganizationsService from '../education-organizations/service';

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
	 * @param user
	 * @param preferences
	 */
	public static async updateNewsletterPreferences(user: Avo.User.User, preferences: Partial<NewsletterPreferences>) {
		try {
			const mappedPreferences = _.toPairs(preferences) as [NewsletterKey, boolean][];

			const email = _.get(user, 'mail');

			const firstName = _.get(user, 'first_name');
			const lastName = _.get(user, 'last_name');
			const name = [firstName, lastName].join(' ').trim();

			const userGroupId = _.get(user, 'profile.userGroupIds[0]');
			const allUserGroups = await AuthService.getAllUserGroups();
			const userGroup = _.get(allUserGroups.find(group => group.id === userGroupId), 'label');

			const oormerk = _.get(user, 'oormerk'); // Wait for https://meemoo.atlassian.net/browse/DEV-949
			const stamboekNumber = _.get(user, 'profile.stamboek');
			const educationLevel = _.get(user, 'profile.educationLevels[0]');

			let school: string;
			const educationalOrganizationId = _.get(user, 'profile.organizations[0].organization_id');
			const educationalOrganizationUnitId = _.get(user, 'profile.organizations[0].unit_id');
			if (educationalOrganizationId) {
				// Waiting for https://meemoo.atlassian.net/browse/AVO-939
				const educationalOrganization = await EducationOrganizationsService.getOrganization(educationalOrganizationId, educationalOrganizationUnitId);
				school = [
					educationalOrganization.city,
					educationalOrganization.name,
					educationalOrganization.units.find(unit => unit.id === educationalOrganizationUnitId),
				].join('___');
			}

			const subjects = _.get(user, 'profile.subjects', []).join(', ');

			await promiseUtils.map(mappedPreferences, async (preference) => {
				const key: NewsletterKey = preference[0];
				const subscribed = preference[1];

				if (subscribed) {
					await CampaignMonitorService.subscribeToNewsletterList(NEWSLETTER_LISTS[key], email, name, {
						Graad: educationLevel,
						Lerarenkaart: stamboekNumber,
						Role: oormerk,
						School: school,
					} as CustomFields);
				} else {
					await CampaignMonitorService.unsubscribeFromNewsletterList(NEWSLETTER_LISTS[key], email);
				}
			});
		} catch (err) {
			throw new InternalServerError('Failed to update newsletter preferences', err, { user, preferences });
		}
	}
}
