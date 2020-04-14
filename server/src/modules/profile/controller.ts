import { Avo } from '@viaa/avo2-types';

import DataService from '../data/service';
import { CustomError } from '../../shared/helpers/error';
import { AuthService } from '../auth/service';

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
	alias: string;
	alternativeEmail: string;
	avatar: string | null;
	bio: string | null;
	stamboek: string | null;
}

export default class ProfileController {
	public static async updateProfile(
		profile: Avo.User.Profile,
		variables: Partial<UpdateProfileValues>
	): Promise<void> {
		try {
			const completeVars: UpdateProfileValues = {
				educationLevels: (profile as any).contexts || [],
				subjects: (profile as any).classifications || [],
				organizations: ((profile as any).organizations || []).map(
					(org: Avo.EducationOrganization.Organization) => ({
						profile_id: profile.id,
						organization_id: org.organizationId,
						unit_id: org.unitId || null,
					})
				),
				alias: profile.alias || profile.alternative_email,
				alternativeEmail: profile.alternative_email,
				avatar: profile.avatar,
				bio: (profile as any).bio || null,
				stamboek: profile.stamboek,
				...variables, // Override current profile variables with the variables in the parameter
			};
			await DataService.execute(DELETE_PROFILE_OBJECTS, {
				profileId: profile.id,
			});
			await DataService.execute(UPDATE_PROFILE_INFO, {
				profileId: profile.id,
				...completeVars,
			});
			if (
				completeVars.educationLevels.find(edLevel => edLevel.key === 'Secundair onderwijs') &&
				!((profile as any).userGroupIds || []).includes(3)
			) {
				// Add "lesgever secundair" to this profile's usergroups
				await AuthService.addUserGroupsToProfile([3], profile.id);
			}
			if (
				!completeVars.educationLevels.find(edLevel => edLevel.key === 'Secundair onderwijs') &&
				((profile as any).userGroupIds || []).includes(3)
			) {
				// Remove "lesgever secundair" from this profile's usergroups
				await AuthService.removeUserGroupsFromProfile([3], profile.id);
			}
		} catch (err) {
			throw new CustomError('Failed to update profile info', err, { profile, variables });
		}
	}
}
