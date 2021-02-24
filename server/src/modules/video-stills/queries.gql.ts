export const GET_ITEM_PIDS_AND_BROWSE_PATHS_BY_IDS = `
	query getItemPidsAndBrowsePathsById($ids: [bpchar!]) {
		app_item_meta(where: { external_id: { _in: $ids } }) {
			external_id,
			browse_path
		}
	}
`;
