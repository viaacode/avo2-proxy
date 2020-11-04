export const HAS_CONTENT = `
	query hasContent($profileId: uuid) {
		has_public_collections: app_collections(limit: 1, where: {is_public: {_eq: true}, owner_profile_id: {_eq: $profileId}}) {
			id
		}
		has_private_collections: app_collections(limit: 1, where: {is_public: {_eq: false}, owner_profile_id: {_eq: $profileId}}) {
			id
		}
		has_assignments: app_assignments(limit: 1, where: {owner_profile_id: {_eq: $profileId}}) {
			id
		}
	}
`;
