export const GET_COLLECTION_BY_ID = `
	query getCollectionById($id: uuid!) {
		app_collections(where: { id: { _eq: $id }, is_deleted: { _eq: false } }) {
			id
			description
			description_long
			collection_fragments(order_by: { position: asc }) {
				use_custom_fields
				updated_at
				start_oc
				position
				id
				external_id
				end_oc
				custom_title
				custom_description
				created_at
				collection_uuid
				type
				thumbnail_path
			}
			updated_at
			type_id
			type {
				label
				id
			}
			title
			note
			briefing_id
			thumbnail_path
			publish_at
			owner_profile_id
			profile {
				alias
				title
				alternative_email
				avatar
				id
				stamboek
				updated_at
				user_id
				user: usersByuserId {
					id
					created_at
					expires_at
					external_uid
					first_name
					last_name
					mail
					uid
					updated_at
					role {
						id
						name
						label
					}
				}
				created_at
				updated_at
				organisation {
					logo_url
					name
					or_id
				}
			}
			is_public
			external_id
			depublish_at
			published_at
			created_at
			lom_classification
			lom_context
			lom_intendedenduserrole
			lom_keywords
			lom_languages
			lom_typicalagerange
			updated_by {
				id
				user: usersByuserId {
					id
					first_name
					last_name
					role {
						id
						label
					}
				}
			}
			collection_labels {
				label
				id
			}
			relations(where: { predicate: { _eq: "IS_COPY_OF" } }) {
				object_meta {
					id
					title
				}
			}
			is_managed
			management {
				id
				current_status
				status_valid_until
				updated_at
				manager_profile_id
				manager {
					profile_id
					full_name
					mail
				}
				note
			}
			management_actualised_at: QC(
				where: { qc_label: { _eq: KWALITEITSCHECK } }
				order_by: { created_at: desc_nulls_last }
				limit: 1
			) {
				id
				created_at
			}
			management_approved_at: QC(
				where: { qc_label: { _eq: EINDCHECK } }
				order_by: { created_at: desc_nulls_last }
				limit: 1
			) {
				id
				created_at
			}
			management_language_check: QC(
				where: { qc_label: { _eq: TAALCHECK } }
				order_by: { created_at: desc_nulls_last }
				limit: 1
			) {
				id
				qc_status
				assignee_profile_id
				assignee {
					profile_id
					full_name
				}
				comment
			}
			management_quality_check: QC(
				where: { qc_label: { _eq: KWALITEITSCHECK } }
				order_by: { created_at: desc_nulls_last }
				limit: 1
			) {
				id
				qc_status
			}
		}
	}
`;

export const GET_ITEMS_BY_IDS = `
	query getItemsByIds($ids: [bpchar!]!) {
		items: app_item_meta(where: {external_id: {_in: $ids}}) {
			id
			uid
			external_id
			duration
			title
			description
			thumbnail_path
			issued
			type {
				id
				label
			}
			organisation {
				name
				logo_url
			}
			relations(where: {predicate: {_eq: "REPLACES"}}) {
				created_at
			}
			item_collaterals(where: {description: {_eq: "subtitle"}}) {
				path
				description
				external_id
			}
		}
	}
`;

export const GET_COLLECTIONS_BY_IDS = `
	query getCollectionsByIds($ids: [uuid!]!) {
		items: app_collections(where: { id: { _in: $ids }, is_deleted: { _eq: false } }) {
			external_id
			id
			thumbnail_path
			updated_at
			organisation {
				logo_url
				name
			}
			title
			avo1_id
			collection_fragments_aggregate {
				aggregate {
					count
				}
			}
		}
	}
`;

export const GET_EXTERNAL_ID_BY_MEDIAMOSA_ID = `
	query getExternalIdByMediaMosaId($mediamosaId: String!) {
		migrate_reference_ids(where: { mediamosa_id: { _eq: $mediamosaId } }) {
			external_id
			id
		}
	}
`;

export const GET_COLLECTIONS_BY_AVO1_ID = `
	query getCollectionsByAvo1Id($avo1Id: String!) {
		items: app_collections(where: { avo1_id: { _eq: $avo1Id }, is_deleted: { _eq: false } }) {
			id
		}
	}
`;

export const GET_PUBLIC_COLLECTIONS_OR_BUNDLES = `
	query getPublicCollectionsOrBundles {
		app_collections(where: {is_public: {_eq: true}, is_deleted: { _eq: false }}) {
			id
			updated_at
			type_id
		}
	}
`;

export const GET_COLLECTIONS_LINKED_TO_ASSIGNMENT = `
	query getAssignmentLinkedToCollection($collectionUuid: String!, $assignmentUuid: uuid!) {
		app_assignments(where: {content_id: {_eq: $collectionUuid}, uuid: {_eq: $assignmentUuid}, is_deleted: { _eq: false }}, limit: 1) {
			uuid
		}
	}
`;
