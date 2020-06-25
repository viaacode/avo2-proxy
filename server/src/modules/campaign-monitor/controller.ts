import * as promiseUtils from 'blend-promise-utils';
import * as _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { AuthService } from '../auth/service';
import EducationOrganizationsService from '../education-organizations/service';

import { NEWSLETTER_LISTS } from './const';
import CampaignMonitorService from './service';
import {
	CustomFields,
	EmailInfo,
	NewsletterKey,
	NewsletterPreferences,
} from './types';

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
	public static async updateNewsletterPreferences(
		user: Avo.User.User,
		preferences: Partial<NewsletterPreferences>
	) {
		try {
			const mappedPreferences = _.toPairs(preferences) as [
				NewsletterKey,
				boolean
			][];

			const email = _.get(user, 'mail');

			const firstName = _.get(user, 'first_name');
			const lastName = _.get(user, 'last_name');
			const name = [firstName, lastName].join(' ').trim();

			const userGroupId = _.get(user, 'profile.userGroupIds[0]');
			const allUserGroups = await AuthService.getAllUserGroups();
			const userGroup = _.get(
				allUserGroups.find(group => group.id === userGroupId),
				'label'
			);

			const oormerk = _.get(user, 'oormerk'); // Wait for https://meemoo.atlassian.net/browse/DEV-949
			const isExceptionAccount = _.get(user, 'is_exception');
			const stamboekNumber = _.get(user, 'profile.stamboek');
			const educationLevels: string[] = _.get(user, 'profile.educationLevels');

			const schoolZipcodes: string[] = [];
			const schoolIds: string[] = [];
			const campusIds: string[] = [];
			const schoolNames: string[] = [];
			const educationalOrganizations: Avo.EducationOrganization.Organization[] = _.get(user, 'profile.organizations') || [];
			await promiseUtils.map(educationalOrganizations, async (org) => {
				const educationalOrganizationId = _.get(org, 'organizationId');
				const educationalOrganizationUnitId = _.get(org, 'unitId');
				if (educationalOrganizationId) {
					// Waiting for https://meemoo.atlassian.net/browse/AVO-939
					const educationalOrganization = await EducationOrganizationsService.getOrganization(
						educationalOrganizationId,
						educationalOrganizationUnitId
					);
					schoolZipcodes.push(educationalOrganization.postal_code);
					schoolNames.push(educationalOrganization.name);
					schoolIds.push(educationalOrganizationId);
					campusIds.push(educationalOrganizationUnitId);
				}
			});

			const subjects = _.get(user, 'profile.subjects', []).join(', ');

			await promiseUtils.map(mappedPreferences, async (preference) => {
				const key: NewsletterKey = preference[0];
				const subscribed = preference[1];

				if (subscribed) {
					const join = (arr: (string | undefined | null)[]) => _.uniq(_.compact(arr)).join(', ');
					await CampaignMonitorService.subscribeToNewsletterList(
						NEWSLETTER_LISTS[key],
						email,
						name,
						{
							oormerk,
							gebruikersgroep: userGroup,
							stamboeknummer: stamboekNumber,
							is_uitzondering: isExceptionAccount ? 'true' : 'false',
							firstname: firstName,
							lastname: lastName,
							graad: join(educationLevels),
							vakken: subjects,
							school_postcodes: join(schoolZipcodes),
							school_ids: join(schoolIds),
							school_campus_ids: join(campusIds),
							school_namen: join(schoolNames),
						} as CustomFields
					);
				} else {
					await CampaignMonitorService.unsubscribeFromNewsletterList(
						NEWSLETTER_LISTS[key],
						email
					);
				}
			});
		} catch (err) {
			throw new InternalServerError(
				'Failed to update newsletter preferences',
				err,
				{ user, preferences }
			);
		}
	}
}
