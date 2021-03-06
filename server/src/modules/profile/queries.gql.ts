export const DELETE_PROFILE_OBJECTS = `
	mutation deleteProfileObjects($profileId: uuid!) {
		delete_users_profile_organizations(where: { profile_id: { _eq: $profileId } }) {
			affected_rows
		}
		delete_users_profile_contexts(where: { profile_id: { _eq: $profileId } }) {
			affected_rows
		}
		delete_users_profile_classifications(where: { profile_id: { _eq: $profileId } }) {
			affected_rows
		}
	}
`;

export const UPDATE_PROFILE_INFO = `
	mutation updateProfileObject(
		$educationLevels: [users_profile_contexts_insert_input!]!
		$subjects: [users_profile_classifications_insert_input!]!
		$organizations: [users_profile_organizations_insert_input!]!
		$company_id: String
		$profileId: uuid!
		$alias: String
		$title: String
		$alternativeEmail: String
		$avatar: String
		$bio: String
		$stamboek: String
		$is_exception: Boolean!
		$userUuid: uuid!
		$firstName: String
		$lastName: String
		$business_category: String
		$updatedAt: timestamptz!
	) {
		insert_users_profile_contexts(objects: $educationLevels) {
			affected_rows
		}
		insert_users_profile_classifications(objects: $subjects) {
			affected_rows
		}
		insert_users_profile_organizations(objects: $organizations) {
			affected_rows
		}
		update_users_profiles(
			where: { id: { _eq: $profileId }, is_deleted: { _eq: false } }
			_set: {
				title: $title
				alternative_email: $alternativeEmail
				avatar: $avatar
				bio: $bio
				stamboek: $stamboek
				company_id: $company_id
				is_exception: $is_exception
				business_category: $business_category
				updated_at: $updatedAt
			}
		) {
			affected_rows
		}
		update_alias: update_users_profiles(
			where: { id: { _eq: $profileId }, is_deleted: { _eq: false },  _or: [
				{ alias: { _is_null: true } },
			  	{ alias: { _neq: $alias } }
		  	] }
			_set: {
				alias: $alias
			}
		) {
			affected_rows
		}
		 update_shared_users(
			 where: {uid: {_eq: $userUuid}, profile: { is_deleted: { _eq: false } }},
			 _set: {
				 first_name: $firstName,
				 last_name: $lastName,
				updated_at: $updatedAt
			 }
		 ) {
			affected_rows
		}
	}
`;
