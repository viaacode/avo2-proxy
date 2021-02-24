export const GET_ASSIGNMENT_OWNER = `
	query getAssignmentOwnerId($assignmentUuid: uuid!) {
		app_assignments(where: {uuid: {_eq: $assignmentUuid}, is_deleted: { _eq: false }}) {
			owner_profile_id
		}
	}
`;

export const GET_COLLECTION_OWNER = `
	query getCollectionOwnerId($collectionId: uuid!) {
		app_collections(where: {id: {_eq: $collectionId}, is_deleted: { _eq: false }}) {
			owner_profile_id
		}
	}
`;
