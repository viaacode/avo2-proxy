import AssetService from './service';
import { AssetInfo, UploadAssetInfo } from './route';

export default class AssetController {

	/**
	 * Upload a file to the asset service and keep a record of the upload in graphql
	 * @param assetInfo
	 */
	public static async upload(assetInfo: UploadAssetInfo): Promise<AssetInfo> {
		// TODO create asset record in asset table once the table is available in the database
		return AssetService.upload(assetInfo);
	}
}
