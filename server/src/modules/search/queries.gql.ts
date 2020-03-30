export const GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID = `
query getCollectionById($id: uuid!) {
  app_collections(where: {id: {_eq: $id}}) {
    is_public
    title
    description
  }
}
`;
