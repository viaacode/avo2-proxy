export const GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID = `
query getCollectionById($collectionId: Int!) {
  app_collections(where: {id: {_eq: $collectionId}}) {
    is_public
    title
    description
  }
}
`;
