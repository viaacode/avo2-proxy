import { remove, uniq } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import { SpecialUserGroup } from '../auth/consts';
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
	title: string | null;
	alternativeEmail: string;
	avatar: string | null;
	bio: string | null;
	stamboek: string | null;
	is_exception: boolean;
}

export default class ProfileController {
	public static async updateProfile(
		profile: Avo.User.Profile,
		variables: Partial<UpdateProfileValues>
	): Promise<UpdateProfileValues> {
		try {
			const completeVars: UpdateProfileValues = {
				educationLevels: uniq(profile.educationLevels || ([] as string[])).map(
					(eduLevel: string) => ({
						profile_id: profile.id,
						key: eduLevel,
					})
				),
				subjects: uniq(profile.subjects || ([] as string[])).map(subject => ({
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
				title: profile.title,
				alternativeEmail: profile.alternative_email,
				avatar: profile.avatar,
				bio: profile.bio || null,
				stamboek: profile.stamboek,
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

			return completeVars;
		} catch (err) {
			throw new CustomError('Failed to update profile info', err, {
				profile,
				variables,
			});
		}
	}

	public static async updateUserGroupsSecondaryEducation(
		userGroupId: number,
		profileId: string,
		educationLevels: string[]
	) {
		await AuthService.removeAllUserGroupsFromProfile(profileId);

		let newUserGroupId = userGroupId; // Only one user group should be set

		// Add extra usergroup for lesgever secundair or student lesgever secundair
		if (
			educationLevels.includes('Secundair onderwijs') &&
			(newUserGroupId === SpecialUserGroup.Teacher ||
				newUserGroupId === SpecialUserGroup.StudentTeacher)
		) {
			newUserGroupId = SpecialUserGroup.TeacherSecondary;
		}

		await AuthService.addUserGroupsToProfile([newUserGroupId], profileId);
	}
}
