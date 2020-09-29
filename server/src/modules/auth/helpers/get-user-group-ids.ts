import _ from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { SpecialPermissionGroups } from '../types';

export function getUserGroupIds(user: Avo.User.User | null | undefined): number[] {
	return [
		..._.get(user, 'profile.userGroupIds', []),
		user ? SpecialPermissionGroups.loggedInUsers : SpecialPermissionGroups.loggedOutUsers,
	];
}
