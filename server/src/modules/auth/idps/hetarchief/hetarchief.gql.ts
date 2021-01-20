export const GET_PROFILE_IDS_BY_LDAP_IDS = `
	query getProfileIdsByLdapIds($userLdapUuids: [String!]!) {
		users_idp_map(where: {idp_user_id: {_in: $userLdapUuids}}) {
			local_user {
				profile {
					id
				}
				mail
			}
		}
	}
`;
