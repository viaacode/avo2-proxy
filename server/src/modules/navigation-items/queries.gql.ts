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

export const GET_CONTENT_PAGE_BY_PATH = `
	query getContentPageByPath($path: String!) {
		app_content(where: { path: { _eq: $path } }) {
			title
			content_type
			content_width
			created_at
			depublish_at
			description
			id
			is_protected
			is_public
			is_published
			publish_at
			path
			contentBlockssBycontentId {
				content_block_type
				content_id
				created_at
				id
				position
				updated_at
				variables
				enum_content_block_type {
					description
					value
				}
			}
			user_group_ids
		}
	}
`;
