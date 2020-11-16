import * as promiseUtils from 'blend-promise-utils';
import { compact, fromPairs, get, isNil, isString, keys, map, toPairs, uniq, values } from 'lodash';
import moment from 'moment';

import type { Avo } from '@viaa/avo2-types';

import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { SpecialUserGroup } from '../auth/consts';
import { AuthService } from '../auth/service';
import { SharedUser, UserGroup, UsersProfile } from '../auth/types';
import EducationOrganizationsService, {
	LdapEducationOrganisation,
} from '../education-organizations/service';

import { BULK_UPDATE_BATCH_SIZE, NEWSLETTER_LISTS } from './campaign-monitor.const';
import CampaignMonitorService from './campaign-monitor.service';
import { CmUserInfo, CustomFields, EmailInfo } from './campaign-monitor.types';

export default class CampaignMonitorController {
	/**
	 * Send an email using the campaign monitor api
	 * @param info
	 */
	static async send(info: EmailInfo): Promise<void> {
		return CampaignMonitorService.send(info);
	}

	/**
	 * Retrieve email preferences from campaign monitor api
	 * @param email
	 */
	static async fetchNewsletterPreferences(email: string): Promise<Avo.Newsletter.Preferences> {
		return CampaignMonitorService.fetchNewsletterPreferences(email);
	}

	/**
	 * Update subscriber info custom fields in Campaign Monitor for specified users
	 * @param allOrActive 'active'     will sync for all users in the database
	 *                    'all'    will sync for all users where their last_access_at date is less than 25 hours ago
	 */
	static async bulkUpdateInfo(allOrActive: 'all' | 'active'): Promise<void> {
		try {
			const allUsers = allOrActive === 'all';
			const userCount = await CampaignMonitorService.countActiveUsers(
				allUsers ? null : moment().subtract(25, 'hours').toISOString()
			);

			logger.info(`triggering bulk update of Campaign monitor info for ${userCount} users`);

			// Handle the users in batches of BULK_UPDATE_BATCH_SIZE users
			const allUserGroups = await AuthService.getAllUserGroups();

			for (let i = 0; i < Math.ceil(userCount / BULK_UPDATE_BATCH_SIZE); i += 1) {
				const users = await CampaignMonitorService.getActiveUsers(
					allUsers ? null : moment().subtract(25, 'hours').toISOString(),
					i * BULK_UPDATE_BATCH_SIZE,
					BULK_UPDATE_BATCH_SIZE
				);
				const userInfos: CmUserInfo[] = await promiseUtils.mapLimit(users, 10, (user) => {
					return this.mapUserToCustomFields(user, allUserGroups);
				});
				await CampaignMonitorService.bulkUpdateSubscriberInfo(userInfos);

				logger.info(
					`bulk update of Campaign monitor info: Finished syncing ${Math.min(
						(i + 1) * BULK_UPDATE_BATCH_SIZE,
						userCount
					)} / ${userCount} users`
				);
			}

			logger.info(`bulk update of Campaign monitor info: Finished syncing all users`);
		} catch (err) {
			throw new InternalServerError(
				'Failed to bulk update custom fields for users in campaign monitor',
				err,
				{
					allOrActive,
				}
			);
		}
	}

	/**
	 * Retrieve email preferences from campaign monitor api
	 * @param user
	 * @param preferences
	 */
	static async updateNewsletterPreferences(
		user: Avo.User.User,
		preferences: Partial<Avo.Newsletter.Preferences>
	) {
		try {
			const mappedPreferences = toPairs(preferences) as [
				Avo.Newsletter.PreferencesKey,
				boolean
			][];

			const allUserGroups = await AuthService.getAllUserGroups();

			await promiseUtils.map(mappedPreferences, async (preference) => {
				const key: Avo.Newsletter.PreferencesKey = preference[0];
				const subscribed = preference[1];

				if (subscribed) {
					const userInfo = await this.mapUserToCustomFields(user, allUserGroups);
					await CampaignMonitorService.subscribeToNewsletterList(
						NEWSLETTER_LISTS[key],
						userInfo
					);
				} else {
					await CampaignMonitorService.unsubscribeFromNewsletterList(
						NEWSLETTER_LISTS[key],
						get(user, 'mail')
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

	private static join(arr: (string | undefined | null)[] | null | undefined) {
		return uniq(compact(arr || [])).join(', ');
	}

	private static async mapUserToCustomFields(
		user: Avo.User.User | SharedUser,
		allUserGroups: UserGroup[]
	): Promise<CmUserInfo> {
		const email = get(user, 'mail');
		const firstName = get(user, 'first_name');
		const lastName = get(user, 'last_name');
		const name = [firstName, lastName].join(' ').trim();

		let userGroupId = get(user, 'profile.userGroupIds[0]');
		if (isNil(userGroupId)) {
			userGroupId = get(user, 'profile.profile_user_group.group.id');
		}
		const userGroup = get(
			allUserGroups.find((group) => group.id === userGroupId),
			'label'
		);

		const isBlocked = get(user, 'is_blocked');
		const createdAt = get(user, 'created_at');
		const createdAtDate = createdAt ? moment(createdAt).format('YYYY/MM/DD') : null;
		const lastAccessAt = get(user, 'last_access_at');
		const lastAccessAtDate = lastAccessAt ? moment(lastAccessAt).format('YYYY/MM/DD') : null;

		const businessCategory = get(user, 'profile.business_category');
		const isExceptionAccount = get(user, 'profile.is_exception') || false;
		const stamboekNumber = get(user, 'profile.stamboek');
		const educationLevels: string[] =
			get(user, 'profile.educationLevels') ||
			(get(user, 'profile.profile_contexts') || []).map((context: any) => context.key);
		const subjects =
			get(user, 'profile.subjects') ||
			(get(user, 'profile.profile_classifications') || []).map(
				(classification: any) => classification.key
			);

		let hasPublicCollections: boolean;
		let hasPrivateCollections: boolean;
		let hasAssignments: boolean;
		if (keys(user.profile).includes('has_public_collections')) {
			// User was fetched specifically to update cm fields and already includes the first content items
			hasPublicCollections = !!get(user, 'profile.hasPublicCollections[0]');
			hasPrivateCollections = !!get(user, 'profile.hasPrivateCollections[0]');
			hasAssignments = !!get(user, 'profile.hasAssignments[0]');
		} else {
			// The user was fetched as part of the login process and we still need to fetch the first content items
			const content = await CampaignMonitorService.getContentCounts(
				String(get(user, 'profile.id'))
			);
			hasPublicCollections = content.hasPublicCollections;
			hasPrivateCollections = content.hasPrivateCollections;
			hasAssignments = content.hasAssignments;
		}

		let idps: string[];
		if (user.idpmaps && isString(user.idpmaps[0])) {
			idps = (user as Avo.User.User).idpmaps;
		} else {
			idps = (((user.idpmaps || []) as unknown) as { idp: string }[]).map(
				(idpObj: { idp: string }) => idpObj.idp
			);
		}
		const hasHetArchiefLink = idps.includes('HETARCHIEF');
		const hasSmartschoolLink = idps.includes('SMARTSCHOOL');
		const hasKlascementLink = idps.includes('KLASCEMENT');

		const schoolZipcodes: string[] = [];
		const schoolIds: string[] = [];
		const campusIds: string[] = [];
		const schoolNames: string[] = [];
		const educationalOrganizations: Avo.EducationOrganization.Organization[] =
			get(user, 'profile.organizations') || get(user, 'profile.profile_organizations') || [];
		await promiseUtils.map(educationalOrganizations, async (org) => {
			const educationalOrganizationId =
				get(org, 'organizationId') || get(org, 'organization_id');
			const educationalOrganizationUnitId = get(org, 'unitId') || get(org, 'unit_id');
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

		const isProfileComplete = CampaignMonitorController.isProfileComplete(user);

		return {
			email,
			name,
			customFields: {
				is_geblokkeerd: isBlocked ? 'true' : 'false',
				aangemaakt_op: createdAtDate,
				laatst_ingelogd_op: lastAccessAtDate,
				heeft_publieke_collecties: hasPublicCollections ? 'true' : 'false',
				heeft_prive_collecties: hasPrivateCollections ? 'true' : 'false',
				heeft_opdrachten: hasAssignments ? 'true' : 'false',
				heeft_hetarchief_link: hasHetArchiefLink ? 'true' : 'false',
				heeft_smartschool_link: hasSmartschoolLink ? 'true' : 'false',
				heeft_klascement_link: hasKlascementLink ? 'true' : 'false',
				is_profiel_compleet: isProfileComplete ? 'true' : 'false',
				gebruikersgroep: userGroup,
				stamboeknummer: stamboekNumber,
				is_uitzondering: isExceptionAccount ? 'true' : 'false',
				oormerk: businessCategory,
				firstname: firstName,
				lastname: lastName,
				onderwijsniveaus: this.join(educationLevels),
				vakken: this.join(subjects),
				school_postcodes: this.join(schoolZipcodes),
				school_ids: this.join(schoolIds),
				school_campus_ids: this.join(campusIds),
				school_namen: this.join(schoolNames),
			} as CustomFields,
		};
	}

	private static isProfileComplete(user: Avo.User.User | SharedUser): boolean {
		const profile = get(user, 'profile');

		// Only teachers have to fill in their profile for now
		const userGroupId = get(user, 'profile.userGroupIds[0]');
		if (
			userGroupId !== SpecialUserGroup.Teacher &&
			userGroupId !== SpecialUserGroup.TeacherSecondary
		) {
			return true;
		}

		if (!!profile && profile.is_exception) {
			return true;
		}

		// TODO keep every user object like the database format (SharedUser) and get values using getters
		return (
			!!profile &&
			!!(profile as Avo.User.Profile).organizations &&
			!!(profile as Avo.User.Profile).organizations.length &&
			!!(profile as UsersProfile).profile_organizations &&
			!!(profile as UsersProfile).profile_organizations.length &&
			!!(profile as Avo.User.Profile).educationLevels &&
			!!(profile as Avo.User.Profile).educationLevels.length &&
			!!(profile as UsersProfile).profile_contexts &&
			!!(profile as UsersProfile).profile_contexts.length &&
			!!(profile as Avo.User.Profile).subjects &&
			!!(profile as Avo.User.Profile).subjects.length &&
			!!(profile as UsersProfile).profile_classifications &&
			!!(profile as UsersProfile).profile_classifications.length
		);
	}

	static async refreshNewsletterPreferences(
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
