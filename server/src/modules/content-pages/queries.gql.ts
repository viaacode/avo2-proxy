export const GET_CONTENT_PAGE_BY_PATH = `
	query getContentPageByPath($path: String!) {
		app_content(where: { path: { _eq: $path } }) {
			content_type
			content_width
			created_at
			depublish_at
			description
			seo_description
			meta_description
			id
			thumbnail_path
			is_protected
			is_public
			path
			user_profile_id
			profile {
				user: usersByuserId {
					first_name
					last_name
					role {
						id
						label
					}
				}
			}
			publish_at
			published_at
			title
			updated_at
			user_group_ids
			content_content_labels {
				content_label {
					id
					label
					link_to
				}
			}
			contentBlockssBycontentId(order_by: { position: asc }) {
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
		}
	}
`;

export const GET_ITEM_TILE_BY_ID = `
	query getItemTileById($id: bpchar!) {
		obj: app_item_meta(where: { external_id: { _eq: $id } }) {
			created_at
			duration
			browse_path
			thumbnail_path
			title
			description
			issued
			organisation {
				name
				logo_url
			}
			type {
				label
				id
			}
			item_collaterals(where: {description: {_eq: "subtitle"}}) {
				path
				description
				external_id
			}
			view_counts_aggregate {
				aggregate {
					sum {
						count
					}
				}
			}
		}
	}
`;

export const GET_ITEM_BY_EXTERNAL_ID = `
	query getItemByExternalId($externalId: bpchar!) {
		app_item_meta(where: {external_id: {_eq: $externalId}}) {
			browse_path
			thumbnail_path
			title
			description
			issued
			organisation {
				name
				logo_url
			}
			type {
				label
			}
			item_collaterals(where: {description: {_eq: "subtitle"}}) {
				path
				description
				external_id
			}
		}
	}
`;

export const GET_COLLECTION_TILE_BY_ID = `
	query getCollectionTileById($id: uuid!) {
		obj: app_collections(where: {id: {_eq: $id}}) {
			created_at
			title
			thumbnail_path
			type {
				label
				id
			}
			collection_fragments_aggregate {
				aggregate {
					count
				}
			}
			view_counts_aggregate {
				aggregate {
					sum {
						count
					}
				}
			}
		}
	}
`;

export const GET_CONTENT_PAGES_WITH_BLOCKS = `
	query getContentPagesWithBlocks(
		$where: app_content_bool_exp
		$offset: Int = 0
		$limit: Int = 10
		$orderBy: [app_content_order_by!] = {},
		$labelIds: [Int!] = [],
		$orUserGroupIds: [app_content_content_labels_bool_exp] = {}
	) {
		app_content(where: $where, limit: $limit, offset: $offset, order_by: $orderBy) {
			content_type
			created_at
			depublish_at
			description
			seo_description
			meta_description
			id
			thumbnail_path
			is_protected
			is_public
			path
			profile {
				user: usersByuserId {
					first_name
					last_name
					role {
						id
						label
					}
				}
			}
			publish_at
			published_at
			title
			updated_at
			content_content_labels {
				content_label {
					id
					label
					link_to
				}
			}
			contentBlockssBycontentId(order_by: { position: asc }) {
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
		}
		app_content_aggregate(where: $where) {
			aggregate {
				count
			}
		}
		app_content_labels(where: {id: {_in: $labelIds}}) {
			id
			content_content_labels_aggregate(where: {_or: $orUserGroupIds}) {
				aggregate {
					count
				}
			}
		}
	}
`;

export const GET_CONTENT_PAGES = `
	query getContentPages(
		$where: app_content_bool_exp,
		$offset: Int = 0,
		$limit: Int = 10,
		$orderBy: [app_content_order_by!] = {},
		$labelIds: [Int!] = [],
		$orUserGroupIds: [app_content_content_labels_bool_exp] = {}
	) {
		app_content(where: $where, limit: $limit, offset: $offset, order_by: $orderBy) {
			content_type
			created_at
			depublish_at
			description
			seo_description
			meta_description
			id
			thumbnail_path
			is_protected
			is_public
			path
			profile {
				user: usersByuserId {
					first_name
					last_name
					role {
						id
						label
					}
				}
			}
			publish_at
			published_at
			title
			updated_at
			user_group_ids
			user_profile_id
			content_content_labels {
				content_label {
					id
					label
					link_to
				}
			}
		}
		app_content_aggregate(where: $where) {
			aggregate {
				count
			}
		}
		app_content_labels(where: {id: {_in: $labelIds}}) {
			id
			content_content_labels_aggregate(where: {_or: $orUserGroupIds}) {
				aggregate {
					count
				}
			}
		}
	}
`;

export const GET_PUBLIC_CONTENT_PAGES = `
	query getPublicContentPages(
		$where: app_content_bool_exp
	) {
		app_content(where: $where) {
			path
			updated_at
		}
	}
`;

export const UPDATE_CONTENT_PAGE_PUBLISH_DATES = `
  mutation publishContentPages($now: timestamptz, $publishedAt: timestamptz) {
    publish_content_pages: update_app_content(
      where: {
        _or: [
          {publish_at: {_lte: $now, _is_null: false}, depublish_at: {_gte: $now, _is_null: false}},
          {publish_at: {_lte: $now, _is_null: false}, depublish_at: {_is_null: true}},
          {publish_at: {_is_null: true}, published_at: {_gte: $now, _is_null: false}}
        ],
        published_at: {_is_null: true}
      },
      _set: {published_at: $publishedAt}
    ) {
      affected_rows
    }
    unpublish_content_pages: update_app_content(
      where: {
        depublish_at: {_lt: $now, _is_null: false},
        published_at: {_is_null: false}
      },
      _set: {published_at: null}
    ) {
      affected_rows
    }
  }
`;
