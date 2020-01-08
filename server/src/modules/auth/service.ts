import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';
import DataService from '../data/service';
import { GET_USER_INFO_BY_ID, GET_USER_INFO_BY_USER_EMAIL } from './queries.gql';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { SharedUser } from './types';
import EducationOrganizationsService, { LdapEducationOrganization } from '../education-organizations/service';
import * as promiseUtils from 'blend-promise-utils';
import { ClientEducationOrganization } from '../education-organizations/route';

export class AuthService {
	public static async getAvoUserInfoByEmail(email: string): Promise<Avo.User.User> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_USER_EMAIL, { email });
			if (response.errors) {
				throw new InternalServerError(
					'Failed to get user info from graphql by user email',
					null,
					{ email, errors: response.errors }
				);
			}
			const user: SharedUser = _.get(response, 'data.users[0]', null);
			return this.simplifyUserObject(user);
		} catch (err) {
			throw new InternalServerError(
				'Failed to get user info from graphql by user email',
				err,
				{ email }
			);
		}
	}

	public static async getAvoUserInfoById(userId: string): Promise<Avo.User.User> {
		try {
			const response = await DataService.execute(GET_USER_INFO_BY_ID, { userId });
			if (response.errors) {
				throw new ExternalServerError(
					'Failed to get user info from graphql by user uid',
					null,
					{ userId, errors: response.errors }
				);
			}
			const user: SharedUser = _.get(response, 'data.users[0]', null);
			return this.simplifyUserObject(user);
		} catch (err) {
			throw new InternalServerError(
				'Failed to get user info from graphql by user uid',
				err,
				{ userId }
			);
		}
	}

	private static async simplifyUserObject(user: SharedUser | null): Promise<Avo.User.User> {
		if (!user) {
			return null;
		}
		// Simplify user object structure
		(user as any).profile = user.profiles[0] || {} as Avo.User.Profile;
		const permissions = new Set<string>();
		_.get(user, 'profiles[0].profile_user_group.groups.group_user_permission_groups', []).forEach((permissionGroup: any) => {
			_.get(permissionGroup, 'permission_group.permission_group_user_permissions', []).forEach((permission: any) => {
				permissions.add(permission.permission.label);
			});
		});
		(user as any).profile.permissions = Array.from(permissions);
		(user as any).idpmaps = _.uniq((user.idpmaps || []).map(obj => obj.idp));
		delete user.profiles;
		delete (user as any).profile.profile_user_group;

		// Simplify linked objects
		(user as any).profile.educationLevels = (_.get(user, 'profile.profile_contexts', []) as { key: string }[]).map(context => context.key);
		(user as any).profile.subjects = (_.get(user, 'profile.profile_classifications', []) as { key: string }[]).map(classification => classification.key);
		(user as any).profile.organizations = await promiseUtils.mapLimit(
			_.get(user, 'profile.profile_organizations', []),
			5,
			async (org): Promise<ClientEducationOrganization> => {
				const ldapOrg: LdapEducationOrganization = await EducationOrganizationsService.getOrganization(org.organization_id, org.unit_id);
				const unitAddress = _.get((ldapOrg.units || []).find(unit => unit.id === org.unit_id), 'address', null);
				return {
					organizationId: org.organization_id,
					unitId: org.unit_id,
					label: ldapOrg.name + (unitAddress ? ` - ${unitAddress}` : ''),
				};
			}
		);
		delete (user as any).profile.profile_contexts;
		delete (user as any).profile.profile_classifications;
		delete (user as any).profile.profile_organizations;
		return user as unknown as Avo.User.User;
	}
}
