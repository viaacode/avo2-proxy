import { gql } from 'apollo-boost';

export const GET_ITEM_BY_ID = gql`
	query getItemById($id: bpchar!) {
		app_item_meta(where: { external_id: { _eq: $id } }) {
			browse_path
		}
	}
`;
