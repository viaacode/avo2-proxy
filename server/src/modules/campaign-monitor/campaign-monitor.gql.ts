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

export const GET_ACTIVE_USERS = `
	query getActiveUsers($where: shared_users_bool_exp!, $offset: Int!, $limit: Int!) {
		shared_users(where: {_and: [$where, {profile: {id: {_is_null: false}}}]}, offset: $offset, limit: $limit) {
			first_name
			last_name
			created_at
      last_access_at
    	is_blocked
			idpmaps {
				idp
			}
			mail
			profile {
				id
				stamboek
				business_category
				is_exception
				profile_user_group {
					group {
						label
						id
					}
				}
				has_public_collections: collections(limit: 1, where: {is_public: {_eq: true}}) {
					id
				}
				has_private_collections: collections(limit: 1, where: {is_public: {_eq: false}}) {
					id
				}
				has_assignments: assignments(limit: 1) {
					id
				}
				profile_classifications {
					key
				}
				profile_contexts {
					key
				}
				profile_organizations {
					organization_id
					unit_id
				}
			}
		}
	}
`;
export const COUNT_ACTIVE_USERS = `
	query getAssignmentResponses($where: shared_users_bool_exp!) {
		shared_users_aggregate(where: $where) {
			aggregate {
				count
			}
		}
	}
`;
