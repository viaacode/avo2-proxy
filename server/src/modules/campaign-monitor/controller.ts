import * as promiseUtils from 'blend-promise-utils';
import { compact, fromPairs, get, map, toPairs, uniq, values } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { AuthService } from '../auth/service';
import EducationOrganizationsService, {
	LdapEducationOrganisation,
} from '../education-organizations/service';

import { NEWSLETTER_LISTS } from './const';
import CampaignMonitorService from './service';
import { CustomFields, EmailInfo } from './types';

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
	public static async fetchNewsletterPreferences(
		email: string
	): Promise<Avo.Newsletter.Preferences> {
		return CampaignMonitorService.fetchNewsletterPreferences(email);
	}

	/**
	 * Retrieve email preferences from campaign monitor api
	 * @param user
	 * @param preferences
	 */
	public static async updateNewsletterPreferences(
		user: Avo.User.User,
		preferences: Partial<Avo.Newsletter.Preferences>
	) {
		try {
			const mappedPreferences = toPairs(preferences) as [
				Avo.Newsletter.PreferencesKey,
				boolean
			][];

			const email = get(user, 'mail');

			const firstName = get(user, 'first_name');
			const lastName = get(user, 'last_name');
			const name = [firstName, lastName].join(' ').trim();

			const userGroupId = get(user, 'profile.userGroupIds[0]');
			const allUserGroups = await AuthService.getAllUserGroups();
			const userGroup = get(
				allUserGroups.find((group) => group.id === userGroupId),
				'label'
			);

			const oormerk = get(user, 'profile.business_category');
			const isExceptionAccount = get(user, 'profile.is_exception') || false;
			const stamboekNumber = get(user, 'profile.stamboek');
			const educationLevels: string[] = get(user, 'profile.educationLevels');

			const schoolZipcodes: string[] = [];
			const schoolIds: string[] = [];
			const campusIds: string[] = [];
			const schoolNames: string[] = [];
			const educationalOrganizations: Avo.EducationOrganization.Organization[] =
				get(user, 'profile.organizations') || [];
			await promiseUtils.map(educationalOrganizations, async (org) => {
				const educationalOrganizationId = get(org, 'organizationId');
				const educationalOrganizationUnitId = get(org, 'unitId');
				if (educationalOrganizationId) {
					// Waiting for https://meemoo.atlassian.net/browse/AVO-939
					const educationalOrganization: LdapEducationOrganisation | null = await EducationOrganizationsService.getOrganization(
						educationalOrganizationId,
						educationalOrganizationUnitId
					);
					if (educationalOrganization) {
						schoolZipcodes.push(educationalOrganization.postal_code);
						schoolNames.push(educationalOrganization.name);
						schoolIds.push(educationalOrganizationId);
						campusIds.push(educationalOrganizationUnitId);
					} else {
						logger.error(
							new ExternalServerError('Failed to find organisation by id', null, {
								educationalOrganizationId,
								educationalOrganizationUnitId,
							})
						);
					}
				}
			});

			const subjects = uniq(get(user, 'profile.subjects') || []).join(', ');

			await promiseUtils.map(mappedPreferences, async (preference) => {
				const key: Avo.Newsletter.PreferencesKey = preference[0];
				const subscribed = preference[1];

				if (subscribed) {
					const join = (arr: (string | undefined | null)[]) =>
						uniq(compact(arr)).join(', ');
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
							onderwijsniveaus: educationLevels.join(),
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
			throw new InternalServerError('Failed to update newsletter preferences', err, {
				user,
				preferences,
			});
		}
	}

	public static async refreshNewsletterPreferences(
		avoUser: Avo.User.User,
		oldAvoUser?: Avo.User.User
	): Promise<void> {
		try {
			const preferences: Avo.Newsletter.Preferences = await CampaignMonitorController.fetchNewsletterPreferences(
				avoUser.mail
			);

			if (oldAvoUser && oldAvoUser.mail !== avoUser.mail) {
				// If mail changed, update the old email in Campaign Monitor
				await promiseUtils.map(values(NEWSLETTER_LISTS), (newsLetterId) =>
					CampaignMonitorService.changeEmail(newsLetterId, oldAvoUser.mail, avoUser.mail)
				);
			}

			await CampaignMonitorController.updateNewsletterPreferences(
				avoUser,
				// Remove entries where the value is false
				// Set the value of allActiveUsers to true
				fromPairs(
					compact(
						map(preferences, (value, key) => {
							if (key === 'allActiveUsers') {
								return ['allActiveUsers', true];
							}
							if (!value) {
								return null;
							}
							return [key, value];
						})
					)
				)
			);
		} catch (err) {
			logger.error(
				new InternalServerError(
					'Failed to refresh newsletter preferences after user update',
					err,
					{ avoUser }
				)
			);
		}
	}
}
