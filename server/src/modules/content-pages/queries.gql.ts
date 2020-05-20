export const GET_CONTENT_PAGE_BY_PATH = `
	query getContentPageByPath($path: String!) {
		app_content(where: { path: { _eq: $path } }) {
			thumbnail_path
			title
			content_type
			content_width
			created_at
			depublish_at
			description
			id
			is_protected
			is_public
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

export const GET_ITEM_TILE_BY_ID = `
	query getItemTileById($id: bpchar!) {
		obj: app_item_meta(where: { external_id: { _eq: $id } }) {
			created_at
			duration
			thumbnail_path
			title
			type {
				label
				id
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
