import { IncomingHttpHeaders } from 'http';
import { compact, get } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import DataService from './service';

export default class DataController {

	public static async execute(query: string, variables: { [varName: string]: any }, allHeaders: IncomingHttpHeaders, user: Avo.User.User | null): Promise<any> {
		// Copy trace id from nginx proxy to a header that hasura will understand
		// TODO check if trace id header is correct
		const traceId = allHeaders['x-viaa-trace-id-header'] as string | undefined;
		const headers: { [headerName: string]: string } = {};

		if (traceId) {
			headers['x-hasura-trace-id'] = traceId;
		}

		// Execute the graphql query
		const response = await DataService.execute(query, variables, headers);

		return DataController.filterResponse(response, user);
	}

	private static filterResponse(response: any, user: Avo.User.User | null) {
		let filteredResponse = { ...response };

		if (!user.profile.permissions.includes('VIEW_ANY_UNPUBLISHED_ITEMS')) {
			filteredResponse = DataController.filterAppMetaData(response);
		}

		filteredResponse = DataController.filterAssignments(response, user);

		return filteredResponse;
	}

	/**
	 * Filters items that are deleted or orphaned and adds errors
	 * @param response response from graphql
	 * @param user
	 */
	private static filterAppMetaData(response: any): { items: any[], errors: string[] } {
		// TODO re-enable once the frontend doesn't use browse_path and thumbnail_path anymore
		const items: Avo.Item.Item[] = get(response, 'data.app_item_meta');

		if (items && items.length) {
			const errors: string[] = [];

			response.data.app_item_meta = compact((items || []).map((item: Avo.Item.Item) => {
				if (item.is_deleted) {
					errors.push('DELETED');
					return null;
				}

				if (!item.is_published) {
					errors.push('DEPUBLISHED');
					return null;
				}

				return item;
			}));

			if (errors && errors.length) {
				response.errors = errors.map((error: string) => {
					return {
						message: error,
					};
				});
			}
		}

		return response;
	}

	/**
	 * Filter assignments that are before their available_at or passed their deadline_at
	 * @param response response from graphql
	 * @param user
	 */
	private static filterAssignments(response: any, user: Avo.User.User | null): { assignments: any[], errors: string[] } {
		const assignments = get(response, 'data.assignments');

		if (assignments && assignments.length) {
			const errors: string[] = [];
			response.data.assignments = compact((assignments || []).map((assignment: Partial<Avo.Assignment.Assignment>) => {
				const isOwner = assignment.owner_profile_id && user && user.profile && user.uid && assignment.owner_profile_id === user.profile.id;

				if (assignment.is_deleted) {
					errors.push('DELETED');
					return null;
				}

				// Owners can always see their assignments even if they are outside of the available_at, deadline_at time interval
				if (assignment.available_at && new Date(assignment.available_at).getTime() < new Date().getTime() && !isOwner) {
					errors.push('NOT_YET_AVAILABLE');
					return null;
				}

				// Owners can always see their assignments even if they are outside of the available_at, deadline_at time interval
				if (new Date().getTime() > new Date(assignment.deadline_at || 0).getTime() && !isOwner) {
					errors.push('PAST_DEADLINE');
					return null;
				}

				return assignment;
			}));
			if (errors && errors.length) {
				response.errors = errors.map((error: string) => {
					return {
						message: error,
					};
				});
			}
		}
		return response;
	}
}
