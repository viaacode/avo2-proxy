export const GET_ITEMS_BY_IDS = `
	query getItemById($ids: [bpchar!]) {
		app_item_meta(where: { external_id: { _in: $ids } }) {
			external_id,
			browse_path
		}
	}
`;
