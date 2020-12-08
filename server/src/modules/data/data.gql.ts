export const GET_ASSIGNMENT_OWNER = `
	query getAssignmentOwnerId($assignmentUuid: uuid!) {
		app_assignments(where: {uuid: {_eq: $assignmentUuid}}) {
			owner_profile_id
		}
	}
`;

export const GET_COLLECTION_OWNER = `
	query getAssignmentOwnerId($collectionId: uuid!) {
		app_collections(where: {id: {_eq: $collectionId}}) {
			owner_profile_id
		}
	}
`;
