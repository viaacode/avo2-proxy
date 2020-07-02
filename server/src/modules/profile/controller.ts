import { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import { AuthService } from '../auth/service';
import DataService from '../data/service';

import { DELETE_PROFILE_OBJECTS, UPDATE_PROFILE_INFO } from './queries.gql';

export interface UpdateProfileValues {
	educationLevels: {
		profile_id: string;
		key: string;
	}[];
	subjects: {
		profile_id: string;
		key: string;
	}[];
	organizations: {
		profile_id: string;
		organization_id: string;
		unit_id: string | null;
	}[];
	company_id: string;
	alias: string;
	alternativeEmail: string;
	avatar: string | null;
	bio: string | null;
	stamboek: string | null;
	title: string | null;
	is_exception: boolean;
}

export default class ProfileController {
	public static async updateProfile(
		profile: Avo.User.Profile,
		variables: Partial<UpdateProfileValues>
	): Promise<void> {
		try {
			const completeVars: UpdateProfileValues = {
				educationLevels: (profile.educationLevels || ([] as string[])).map(
					(eduLevel: string) => ({
						profile_id: profile.id,
						key: eduLevel,
					})
				),
				subjects: (profile.subjects || ([] as string[])).map(subject => ({
					profile_id: profile.id,
					key: subject,
				})),
				organizations: ((profile as any).organizations || []).map(
					(org: Avo.EducationOrganization.Organization) => ({
						profile_id: profile.id,
						organization_id: org.organizationId,
						unit_id: org.unitId || null,
					})
				),
				company_id: variables.company_id || profile.company_id,
				alias: profile.alias || profile.alternative_email,
				alternativeEmail: profile.alternative_email,
				avatar: profile.avatar,
				bio: profile.bio || null,
				stamboek: profile.stamboek,
				title: profile.title,
				is_exception: profile.is_exception || false,
				...variables, // Override current profile variables with the variables in the parameter
			};
			await DataService.execute(DELETE_PROFILE_OBJECTS, {
				profileId: profile.id,
			});
			await DataService.execute(UPDATE_PROFILE_INFO, {
				profileId: profile.id,
				...completeVars,
			});

			const userGroupIds = (profile as any).userGroupIds || [];
			await this.updateUserGroupsSecondaryEducation(
				userGroupIds,
				profile.id,
				(completeVars.educationLevels || []).map(el => el.key)
			);
		} catch (err) {
			throw new CustomError('Failed to update profile info', err, {
				profile,
				variables,
			});
		}
	}

	public static async updateUserGroupsSecondaryEducation(
		userGroupIds: number[],
		profileId: string,
		educationLevels: string[]
	) {
		// Add extra usergroup for lesgever secundair en student lesgever secudair
		if (
			educationLevels.includes('Secundair onderwijs') &&
			userGroupIds.includes(2) &&
			!userGroupIds.includes(3)
		) {
			await AuthService.addUserGroupsToProfile([3], profileId);
			await AuthService.removeUserGroupsFromProfile([2], profileId);
		}
		if (
			educationLevels.includes('Secundair onderwijs') &&
			userGroupIds.includes(23) &&
			!userGroupIds.includes(5)
		) {
			await AuthService.addUserGroupsToProfile([5], profileId);
			await AuthService.removeUserGroupsFromProfile([23], profileId);
		}

		// Remove usergroup if not lesgever secundair nor student lesgever secudair
		if (!educationLevels.includes('Secundair onderwijs') && userGroupIds.includes(3)) {
			await AuthService.removeUserGroupsFromProfile([3], profileId);
		}
		if (userGroupIds.includes(2) && userGroupIds.includes(3)) {
			await AuthService.removeUserGroupsFromProfile([2], profileId);
		}
		if (!educationLevels.includes('Secundair onderwijs') && userGroupIds.includes(5)) {
			await AuthService.removeUserGroupsFromProfile([5], profileId);
		}
		if (userGroupIds.includes(23) && userGroupIds.includes(5)) {
			await AuthService.removeUserGroupsFromProfile([23], profileId);
		}
	}
}
