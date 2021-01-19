export const GET_ITEM_BROWSE_PATHS_BY_IDS = `
	query getItemBrowsePathsById($ids: [bpchar!]) {
		app_item_meta(where: { external_id: { _in: $ids } }) {
			external_id,
			browse_path
		}
	}
`;
