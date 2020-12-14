export const GET_ASSIGNMENT_OWNER = `
	query getAssignmentOwnerId($assignmentId: Int!) {
		app_assignments(where: {id: {_eq: $assignmentId}, is_deleted: { _eq: false }}) {
			owner_profile_id
		}
	}
`;

export const GET_COLLECTION_OWNER = `
	query getAssignmentOwnerId($collectionId: uuid!) {
		app_collections(where: {id: {_eq: $collectionId}, is_deleted: { _eq: false }}) {
			owner_profile_id
		}
	}
`;
