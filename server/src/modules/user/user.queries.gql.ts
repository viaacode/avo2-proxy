export const BULK_DELETE_USERS = `
	mutation bulkDeleteUsers($profileIds: [uuid!]!) {
		delete_shared_users(where: {profile: {id: {_in: $profileIds}}}) {
			affected_rows
		}
	}
`;

export const BULK_STRIP_USERS = `
	mutation bulkStripUsers($profileIds: [uuid!]!) {
		delete_users_email_preferences(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_users_idp_map(where: {local_user: {profile: {id: {_in: $profileIds}}}}) {
			affected_rows
		}
		delete_users_notifications(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_users_profile_classifications(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_users_profile_contexts(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_users_profile_organizations(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_users_profile_user_groups(where: {user_profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		update_users_profiles(
			where: {id: {_in: $profileIds}},
			_set: {
				alias: null,
				alternative_email: null,
				avatar: null,
				bio: null,
				business_category: null,
				company_id: null,
				is_exception: false,
				stamboek: null,
				title: null
			}
		) {
			affected_rows
		}
		update_shared_users(
			where: {profile: {id: {_in: $profileIds}}},
			_set: {
				expires_at: null,
				is_blocked: null,
				role_id: null,
				type_label: null
			}
		) {
			affected_rows
		}
	}
`;

export const UPDATE_NAME_AND_MAIL = `
	mutation updateNameAndMail($profileId: uuid!, $firstName: String!, $lastName: String!, $mail: String!) {
		update_shared_users(where: {profile: {id: {_eq: $profileId}}}, _set: {first_name: $firstName, last_name: $lastName, mail: $mail}) {
			affected_rows
		}
	}
`;

export const UPDATE_MAIL = `
	mutation updateNameAndMail($profileId: uuid!, $mail: String!) {
		update_shared_users(where: {profile: {id: {_eq: $profileId}}}, _set: {mail: $mail}) {
			affected_rows
		}
	}
`;

export const BULK_GET_EMAIL_ADDRESSES = `
	query getEmailAddresses($profileIds: [uuid!]!) {
		shared_users(where: {profile: {id: {_in: $profileIds}}}) {
			uid
			mail
		}
	}
`;

export const DELETE_PUBLIC_CONTENT_FOR_PROFILES = `
	mutation bulkDeletePublicContentForProfiles($profileIds: [uuid!]!) {
		delete_app_collections(where: {profile: {id: {_in: $profileIds}}, is_public: {_eq: true}}) {
			affected_rows
		}
		delete_app_content(where: {user_profile_id: {_in: $profileIds}, is_public: {_eq: true}}) {
			affected_rows
		}
	}
`;

export const DELETE_PRIVATE_CONTENT_FOR_PROFILES = `
	mutation bulkDeletePrivateContentForProfiles($profileIds: [uuid!]!) {
		delete_app_collections(where: {profile: {id: {_in: $profileIds}}, is_public: {_eq: false}}) {
			affected_rows
		}
		delete_app_assignments(where: {owner_profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_app_collection_bookmarks(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_app_item_bookmarks(where: {profile_id: {_in: $profileIds}}) {
			affected_rows
		}
		delete_app_content(where: {user_profile_id: {_in: $profileIds}, is_public: {_eq: false}}) {
			affected_rows
		}
	}
`;

export const TRANSFER_PUBLIC_CONTENT_FOR_PROFILES = `
	mutation bulkTransferPublicContentForProfiles($profileIds: [uuid!]!, $transferToProfileId: uuid!) {
		update_app_collections(where: {profile: {id: {_in: $profileIds}}, is_public: {_eq: true}}, _set: {owner_profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_content(where: {user_profile_id: {_in: $profileIds}, is_public: {_eq: true}}, _set: {user_profile_id: $transferToProfileId}) {
			affected_rows
		}
	}
`;

export const TRANSFER_PRIVATE_CONTENT_FOR_PROFILES = `
	mutation bulkTransferPrivateContentForProfiles($profileIds: [uuid!]!, $transferToProfileId: uuid!) {
		update_app_collections(where: {profile: {id: {_in: $profileIds}}, is_public: {_eq: false}}, _set: {owner_profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_assignments(where: {owner_profile_id: {_in: $profileIds}}, _set: {owner_profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_collection_bookmarks(where: {profile_id: {_in: $profileIds}}, _set: {profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_item_bookmarks(where: {profile_id: {_in: $profileIds}}, _set: {profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_content(where: {user_profile_id: {_in: $profileIds}, is_public: {_eq: false}}, _set: {user_profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_assignment_labels(where: {owner_profile_id: {_in: $profileIds}}, _set: {owner_profile_id: $transferToProfileId}) {
			affected_rows
		}
		update_app_content_assets(where: {owner_id: {_in: $profileIds}}, _set: {owner_id: $transferToProfileId}) {
			affected_rows
		}
	}
`;
