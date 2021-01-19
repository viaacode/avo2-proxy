export const GET_PROFILES_BY_STAMBOEK = `
	query getProfilesByStamboek($stamboekNumber: String!) {
		users_profiles(where: {stamboek: {_eq: $stamboekNumber}, is_deleted: { _eq: false }}, limit: 1) {
			stamboek
		}
	}
`;
