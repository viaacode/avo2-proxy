export const INSERT_ORGANIZATIONS = `
	mutation insertOrganizations($organizations: [shared_organisations_insert_input!]!) {
		insert_shared_organisations(objects: $organizations) {
			affected_rows
		}
	}
`;

export const DELETE_ORGANIZATIONS = `
	mutation deleteOrganizations {
		delete_shared_organisations(where: {}) {
			affected_rows
		}
	}
`;

export const GET_ORGANIZATIONS = `
	query getOrganisation($id: String!) {
		shared_organisations(where: {or_id: {_eq: $id}}) {
			or_id
			name
			logo_url
		}
	}
`;
