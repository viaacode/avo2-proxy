export const GET_USER_INFO_BY_USER_EMAIL = `
query getUserInfoByMail($email: String!) {
  users: shared_users(limit: 1, where: {mail: {_eq: $email}}) {
    id
    first_name
    last_name
    profiles {
      id
      alias
      alternative_email
      avatar
      created_at
      location
      stamboek
      updated_at
      user_id
      profile_user_group {
        group {
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
    }
    created_at
    expires_at
    external_uid
    role {
      label
      name
    }
    type
    uid
    updated_at
    mail
    organisation_id
    idpmaps {
      idp
    }
  }
}
`;

export const GET_USER_INFO_BY_ID = `
query getUserInfoByMail($userId: uuid!) {
  users: shared_users(limit: 1, where: {uid: {_eq: $userId}}) {
    id
    first_name
    last_name
    profiles {
      id
      alias
      alternative_email
      avatar
      created_at
      location
      stamboek
      updated_at
      user_id
      profile_user_group {
        group {
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
    }
    created_at
    expires_at
    external_uid
    role {
      label
      name
    }
    type
    uid
    updated_at
    mail
    organisation_id
    idpmaps {
      idp
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

export const GET_USER_BY_IDP_ID = `
query getUserByIdpId($idpType: users_idps_enum!, $idpId: uuid!) {
  shared_users(where: {_and: {idp: {_eq: $idpType}, local_user_id: {_eq: $idpId}}}) {
    local_user_id
  }
}
`;

export const GET_PROFILE_IDS_BY_USER_UID = `
query getProfileIdsByUserUid($userUid: uuid!) {
  users_profiles(where: {user_id: {_eq: $userUid}}) {
    id
  }
}
`;
