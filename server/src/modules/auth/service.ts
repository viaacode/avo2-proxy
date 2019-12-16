import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';
import DataService from '../data/service';
import { GET_USER_INFO_BY_ID, GET_USER_INFO_BY_USER_EMAIL } from './queries.gql';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { SharedUser } from './types';
import EducationOrganizationsService from '../education-organizations/service';
import * as promiseUtils from 'blend-promise-utils';

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
		(user as any).profile = user.profiles[0];
		const permissions = new Set<string>();
		_.get(user, 'profiles[0].groups', []).forEach((group: any) => {
			_.get(group, 'group.group_user_permission_groups', []).forEach((permissionGroup: any) => {
				_.get(permissionGroup, 'permission_group.permission_group_user_permissions', []).forEach((permission: any) => {
					permissions.add(permission.permission.label);
				});
			});
		});
		(user as any).permissions = Array.from(permissions);
		(user as any).idpmaps = _.uniq((user.idpmaps || []).map(obj => obj.idp));
		delete user.profiles;
		(user as any).educationLevels = (_.get(user, 'profile.profile_contexts', []) as {key: string}[]).map(context => context.key);
		(user as any).subjects = (_.get(user, 'profile.profile_classifications', []) as {key: string}[]).map(classification => classification.key);
		(user as any).organizations = await promiseUtils.mapLimit(_.get(user, 'profile.profile_organizations', []), 5, async (org) => {
			const ldapOrg = await EducationOrganizationsService.getOrganization(org.organization_id, org.unit_id);
			return {
				organizationName: ldapOrg.name,
				unitAddress: _.get(ldapOrg.units.find(unit => unit.id === org.unit_id), 'address', null),
			};
		});
		return user as unknown as Avo.User.User;
	}
}
