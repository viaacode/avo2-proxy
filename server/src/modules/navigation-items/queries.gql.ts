export const GET_NAVIGATION_ITEMS = `
	query getNavigationItems {
		app_content_nav_elements {
			external_link
			link_target
			placement
			position
			id
			icon_name
			group_access
			label
			updated_at
			description
			created_at
			content_id
		}
	}
`;
