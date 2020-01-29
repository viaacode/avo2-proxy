export const GET_NAVIGATION_ITEMS = `
	query getNavigationItems {
		app_content_nav_elements {
			content_path
			content_type
			link_target
			placement
			position
			id
			icon_name
			user_group_ids
			label
			updated_at
			description
			created_at
			content_id
		}
	}
`;
