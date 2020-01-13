import { Request } from 'express';

import { Avo } from '@viaa/avo2-types';

import { IdpHelper } from '../auth/idp-helper';
import _ from 'lodash';
import DataService from '../data/service';
import { GET_NAVIGATION_ITEMS } from './queries.gql';
import { ExternalServerError } from '../../shared/helpers/error';

interface GetNavElementsResponse {
	errors?: any;
	data?: {
		app_content_nav_elements: AppContentNavElement[];
	};
}

export interface AppContentNavElement {
	external_link: any;
	link_target: string;
	placement: string;
	position: number;
	id: number;
	icon_name: string;
	group_access: number[];
	label: string;
	updated_at: string;
	description: string;
	created_at: string;
	content_id: any;
}

export type NavItemMap = { [navBarName: string]: AppContentNavElement[] };

export default class NavigationItemsController {
	/**
	 * Gets navigation items that the current user can see
	 * AppContentNavElement.group_access can contain any userGroup ids and also -1, -2
	 *    -1 is a special group: logged out users
	 *    -2 is a special group: logged in users
	 *        since you can have a user that isn't a member of any userGroups
	 */
	public static async getNavigationItems(request: Request): Promise<NavItemMap> {
		try {
			const user: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(request);
			const groups = [...(_.get(user, 'profile.userGroupIds', [])), !!user ? -2 : -1];
			const response: GetNavElementsResponse = await DataService.execute(GET_NAVIGATION_ITEMS);

			if (response.errors) {
				throw new ExternalServerError('Query from graphql returned errors', null, { response });
			}

			const navItems: AppContentNavElement[] = _.get(response, 'data.app_content_nav_elements', []);
			const visibleItems: AppContentNavElement[] = [];
			navItems.forEach((navItem) => {
				if (navItem.group_access && navItem.group_access.length) {
					// If the page doesn't have any groups specified, it isn't visible for anyone
					if (_.intersection(groups, navItem.group_access).length) {
						// The logged in user has at least one user group that is required to view the nav item
						visibleItems.push(navItem);
					}
				}
			});
			return _.groupBy(visibleItems, 'placement');
		} catch (err) {
			throw new ExternalServerError('Failed to get user groups from graphql', err);
		}
	}
}
