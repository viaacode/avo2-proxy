import { Request } from 'express';
import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { ExternalServerError } from '../../shared/helpers/error';
import { getUserGroupIds } from '../auth/helpers/get-user-group-ids';
import { IdpHelper } from '../auth/idp-helper';
import DataService from '../data/service';

import { GET_NAVIGATION_ITEMS } from './queries.gql';

interface GetNavElementsResponse {
	errors?: any;
	data?: {
		app_content_nav_elements: AppContentNavElement[];
	};
}

export interface AppContentNavElement {
	content_path: string;
	content_type:
	| 'CONTENT_PAGE'
	| 'COLLECTION'
	| 'ITEM'
	| 'DROPDOWN'
	| 'INTERNAL_LINK'
	| 'EXTERNAL_LINK'; // TODO Avo.Menu.ContentType;
	link_target: string;
	placement: string;
	position: number;
	id: number;
	icon_name: string;
	user_group_ids: number[];
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
	 * AppContentNavElement.user_group_ids can contain any userGroup ids and also -1, -2
	 *    -1 is a special group: logged out users
	 *    -2 is a special group: logged in users
	 *        since you can have a user that isn't a member of any userGroups
	 */
	public static async getNavigationItems(request: Request): Promise<NavItemMap> {
		try {
			const user: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(request);
			const groups = getUserGroupIds(user);
			const response: GetNavElementsResponse = await DataService.execute(
				GET_NAVIGATION_ITEMS
			);

			if (response.errors) {
				throw new ExternalServerError('Query from graphql returned errors', null, {
					response,
				});
			}

			const navItems: AppContentNavElement[] = _.get(
				response,
				'data.app_content_nav_elements',
				[]
			);
			const visibleItems: AppContentNavElement[] = [];
			navItems.forEach(navItem => {
				if (navItem.user_group_ids && navItem.user_group_ids.length) {
					// If the page doesn't have any groups specified, it isn't visible for anyone
					if (_.intersection(groups, navItem.user_group_ids).length) {
						// The logged in user has at least one user group that is required to view the nav item
						visibleItems.push(navItem);
					}
				}
			});
			return _.groupBy(visibleItems, 'placement');
		} catch (err) {
			throw new ExternalServerError('Failed to get navigation items', err);
		}
	}
}
