export const GET_USER_INFO_BY_USER_EMAIL = `
	query getUserInfoByMail($email: String!) {
		users: shared_users(limit: 1, where: {mail: {_eq: $email}, profile: { is_deleted: { _eq: false } }}) {
			first_name
			last_name
			is_blocked
			profile {
				id
				alias
				title
				alternative_email
				avatar
				created_at
				stamboek
				bio
				updated_at
				user_id
				is_exception
				company_id
				organisation {
					logo_url
					name
					or_id
				}
				profile_user_group {
					group {
						id
						group_user_permission_groups {
							permission_group {
								permission_group_user_permissions {
									permission {
										label
									}
								}
							}
						}
					}
				}
				profile_classifications {
					key
				}
				profile_contexts {
					key
				}
				profile_organizations {
					unit_id
					organization_id
				}
			}
			created_at
			expires_at
			last_access_at
			external_uid
			role {
				label
				name
			}
			uid
			updated_at
			mail
			idpmaps {
				idp
				idp_user_id
			}
		}
	}
`;

export const GET_USER_INFO_BY_ID = `
	query getUserInfoById($userId: uuid!) {
		users: shared_users(limit: 1, where: {uid: {_eq: $userId}, profile: { is_deleted: { _eq: false } }}) {
			first_name
			last_name
			is_blocked
			profile {
				id
				alias
				title
				alternative_email
				avatar
				created_at
				stamboek
				bio
				updated_at
				user_id
				is_exception
				company_id
				organisation {
					logo_url
					name
					or_id
				}
				profile_user_group {
					group {
						id
						group_user_permission_groups {
							permission_group {
								permission_group_user_permissions {
									permission {
										label
									}
								}
							}
						}
					}
				}
				profile_classifications {
					key
				}
				profile_contexts {
					key
				}
				profile_organizations {
					unit_id
					organization_id
				}
			}
			created_at
			expires_at
			last_access_at
			external_uid
			role {
				label
				name
			}
			uid
			updated_at
			mail
			idpmaps {
				idp
				idp_user_id
			}
		}
	}
`;

export const GET_USER_BY_LDAP_UUID = `
	query getUserByLdapUuid($ldapUuid: String!) {
		users_idp_map(where: {idp: {_eq: HETARCHIEF}, idp_user_id: {_eq: $ldapUuid}}, limit: 1) {
			local_user {
				first_name
				last_name
				is_blocked
				profile {
					id
					alias
					title
					alternative_email
					avatar
					created_at
					stamboek
					bio
					updated_at
					user_id
					is_exception
					company_id
					organisation {
						logo_url
						name
						or_id
					}
					profile_user_group {
						group {
							id
							group_user_permission_groups {
								permission_group {
									permission_group_user_permissions {
										permission {
											label
										}
									}
								}
							}
						}
					}
					profile_classifications {
						key
					}
					profile_contexts {
						key
					}
					profile_organizations {
						unit_id
						organization_id
					}
				}
				created_at
				expires_at
				last_access_at
				external_uid
				role {
					label
					name
				}
				uid
				updated_at
				mail
				idpmaps {
					idp
					idp_user_id
				}
			}
		}
	}
`;

export const INSERT_USER = `
	mutation insertUser($user: shared_users_insert_input!) {
		insert_shared_users(objects: [$user]) {
			returning {
				uid
			}
		}
	}
`;

export const INSERT_PROFILE = `
	mutation insertProfile($profile: users_profiles_insert_input!) {
		insert_users_profiles(objects: [$profile]) {
			returning {
				id
			}
		}
	}
`;

export const GET_IDP_MAP = `
	query insertIdp($idpType: users_idps_enum!, $idpUserId: String!, $localUserId: uuid!) {
		users_idp_map(where: {idp_user_id: {_eq: $idpUserId}, local_user_id: {_eq: $localUserId}, idp: {_eq: $idpType}}) {
			id
		}
	}
`;

/**
 * Link a user to a specific idp id
 * Eg: user links their account to smartschool
 */
export const INSERT_IDP_MAP = `
	mutation insertIdp($idpMap: users_idp_map_insert_input!) {
		insert_users_idp_map(objects: [$idpMap]) {
			affected_rows
		}
	}
`;

/**
 * Unlink a user from a specific idp
 */
export const DELETE_IDP_MAPS = `
	mutation deleteIdp($idpType: users_idps_enum!, $avoUserId: uuid!) {
		delete_users_idp_map(where: {idp: {_eq: $idpType}, local_user_id: {_eq: $avoUserId}}) {
			affected_rows
		}
	}
`;

export const GET_USER_BY_IDP_ID = `
	query getUserByIdpId($idpType: users_idps_enum!, $idpId: String!) {
		shared_users(where: {idpmaps: {idp: {_eq: $idpType}, idp_user_id: {_eq: $idpId}}, profile: { is_deleted: { _eq: false } }}) {
			uid
		}
	}
`;

export const GET_PROFILE_IDS_BY_USER_UID = `
	query getProfileIdsByUserUid($userUid: uuid!) {
		users_profiles(where: {user_id: {_eq: $userUid}, is_deleted: { _eq: false }}) {
			id
		}
	}
`;

export const LINK_USER_GROUPS_TO_PROFILE = `
	mutation linkUserGroupToProfile($objects: [users_profile_user_groups_insert_input!]!) {
		insert_users_profile_user_groups(objects: $objects) {
			returning {
				id
			}
		}
	}
`;

export const UNLINK_ALL_USER_GROUPS_FROM_PROFILE = `
	mutation unlinkAllUserGroupsFromProfile($profileId: uuid!) {
		delete_users_profile_user_groups(where: {user_profile_id: {_eq: $profileId}}) {
			returning {
				id
			}
		}
	}
`;

export const GET_USER_ROLE_BY_NAME = `
	query getUserRoles($roleName: String!) {
		shared_user_roles(where: {name: {_eq: $roleName}}) {
			id
		}
	}
`;

export const GET_USER_GROUPS = `
	query getUserGroups {
		users_groups {
			label
			id
			ldap_role
		}
	}
`;

export const GET_NOTIFICATION = `
	query getNotification($key: String!, $profileId: uuid!) {
		users_notifications(where: { profile_id: { _eq: $profileId }, key: { _eq: $key } }) {
			through_email
			through_platform
		}
	}
`;

export const UPDATE_USER_LAST_ACCESS_DATE = `
	mutation updateUserLastAccessDate($userUid: uuid!, $date: timestamptz) {
		update_shared_users(where: {uid: {_eq: $userUid}, profile: { is_deleted: { _eq: false } }}, _set: {last_access_at: $date, updated_at: $date}) {
			affected_rows
		}
		update_users_profiles(where: {user_id: {_eq: $userUid}, is_deleted: { _eq: false }}, _set: {updated_at: $date}) {
			affected_rows
		}
	}
`;

export const UPDATE_AVO_USER = `
	mutation updateUser($uid: uuid!, $user: shared_users_set_input!) {
		update_shared_users(where: {uid: {_eq: $uid}, profile: { is_deleted: { _eq: false } }}, _set: $user) {
			affected_rows
		}
	}
`;
