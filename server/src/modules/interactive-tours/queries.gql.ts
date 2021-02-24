export const GET_INTERACTIVE_TOUR_ROUTE_IDS = `
	query getInteractiveTourRouteIds {
		app_interactive_tour {
			page_id: page
		}
	}
`;

export const GET_INTERACTIVE_TOUR_WITH_STATUSES = `
	query getInteractiveTourWithStatuses(
		$routeId: String!
		$notificationKeyPrefix: String!
		$profileId: uuid!
	) {
		app_interactive_tour(where: { page: { _eq: $routeId } }, order_by: { created_at: asc }) {
			steps
			id
		}
		users_notifications(
			where: { profile_id: { _eq: $profileId }, key: { _ilike: $notificationKeyPrefix } }
		) {
			through_platform
			key
		}
	}
`;

export const GET_INTERACTIVE_TOUR_WITHOUT_STATUSES = `
	query getInteractiveTourWithoutStatuses($routeId: String!) {
		app_interactive_tour(where: { page: { _eq: $routeId } }, order_by: { created_at: asc }) {
			steps
			id
		}
	}
`;
