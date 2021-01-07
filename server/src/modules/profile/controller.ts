import { isNull, remove, uniq } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import { SpecialUserGroup } from '../auth/consts';
import { AuthService } from '../auth/service';
import DataService from '../data/data.service';

import { DELETE_PROFILE_OBJECTS, UPDATE_PROFILE_INFO } from './queries.gql';

export interface UpdateProfileValues {
	userId: string; // User id of the user that you want to update
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
	company_id: string | null;
	firstName: string;
	lastName: string;
	alias: string;
	title: string | null;
	alternativeEmail: string;
	avatar: string | null;
	bio: string | null;
	stamboek: string | null;
	is_exception: boolean;
	business_category: string | null;
}

export default class ProfileController {
	public static async updateProfile(
		user: Avo.User.User,
		variables: Partial<UpdateProfileValues>
	): Promise<Partial<UpdateProfileValues>> {
		try {
			const profile = user.profile;
			const completeVars: Partial<UpdateProfileValues> = {
				educationLevels: uniq(profile.educationLevels || ([] as string[])).map(
					(eduLevel: string) => ({
						profile_id: profile.id,
						key: eduLevel,
					})
				),
				subjects: uniq(profile.subjects || ([] as string[])).map((subject) => ({
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
				company_id: isNull(variables.company_id)
					? null
					: variables.company_id || profile.company_id,
				alias: profile.alias || profile.alternative_email,
				firstName: user.first_name,
				lastName: user.last_name,
				title: profile.title,
				alternativeEmail: profile.alternative_email,
				avatar: profile.avatar,
				bio: profile.bio || null,
				stamboek: profile.stamboek,
				is_exception: profile.is_exception || false,
				business_category: (profile as any).business_category || null, // TODO remove cast after update to typings v2.25.0
				...variables, // Override current profile variables with the variables in the parameter
			};
			delete completeVars.userId;

			await DataService.execute(DELETE_PROFILE_OBJECTS, {
				profileId: profile.id,
			});
			await DataService.execute(UPDATE_PROFILE_INFO, {
				profileId: profile.id,
				userUuid: user.uid,
				...completeVars,
				updatedAt: new Date().toISOString(),
			});

			return completeVars;
		} catch (err) {
			throw new CustomError('Failed to update profile info', err, {
				user,
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
		if (educationLevels.includes('Secundair onderwijs')) {
			if (newUserGroupId === SpecialUserGroup.Teacher) {
				newUserGroupId = SpecialUserGroup.TeacherSecondary;
			}
			if (newUserGroupId === SpecialUserGroup.StudentTeacher) {
				newUserGroupId = SpecialUserGroup.StudentTeacherSecondary;
			}
		}

		await AuthService.addUserGroupsToProfile([newUserGroupId], profileId);
	}
}
