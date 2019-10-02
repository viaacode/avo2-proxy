export const GET_USER_INFO_BY_USER_EMAIL = `
query getUserInfoByMail($email: String!) {
  users: shared_users(limit: 1, where: {mail: {_eq: $email}}) {
    id
    first_name
    last_name
    profiles(limit: 1) {
      id
      alias
      alternative_email
      avatar
      created_at
      location
      stamboek
      updated_at
      user_id
      groups {
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
  }
}
`;
