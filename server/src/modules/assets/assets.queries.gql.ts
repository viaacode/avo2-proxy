export const GET_CONTENT_ASSET = `
	query getContentAssetOwnerId($url: String!) {
		app_content_assets(where: {path: {_eq: $url}}) {
			owner_id
			content_asset_type_id
		}
	}
`;

export const INSERT_CONTENT_ASSET = `
	mutation insertContentAsset($asset: app_content_assets_insert_input!) {
		insert_app_content_assets(objects: [$asset]) {
			affected_rows
		}
	}
`;

export const DELETE_CONTENT_ASSET = `
	mutation deleteContentAsset($url: String!) {
		delete_app_content_assets(where: {path: {_eq: $url}}) {
			affected_rows
		}
	}
`;
