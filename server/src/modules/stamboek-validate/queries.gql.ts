export const GET_ITEMS_BY_IDS = `
	query getItemById($ids: [bpchar!]) {
		app_item_meta(where: { external_id: { _in: $ids } }) {
			browse_path
		}
	}
`;

export const GET_PROFILES_BY_STAMBOEK = `
	query getProfilesByStamboek($stamboekNumber: String!) {
		users_profiles(where: {stamboek: {_eq: $stamboekNumber}, is_deleted: { _eq: false }}, limit: 1) {
			stamboek
		}
	}
`;
