export const GET_ITEM_BY_ID = `
	query getItemById($id: bpchar!) {
		app_item_meta(where: { external_id: { _eq: $id } }) {
			browse_path
		}
	}
`;
