export const GET_ITEM_THUMBNAIL_BY_EXTERNAL_ID = `
	query getItemThumbnailsByExternalIds($externalIds: [bpchar!]!) {
		app_item_meta(where: {external_id: {_in: $externalIds}}) {
			external_id
			thumbnail_path
		}
	}
`;
