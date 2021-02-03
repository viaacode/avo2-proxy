export const GET_ITEM_BROWSE_PATH_BY_EXTERNAL_ID = `
	query getItemByExternalId($externalId: bpchar!) {
		app_item_meta(where: { external_id: { _eq: $externalId } }) {
			browse_path
		}
	}
`;
