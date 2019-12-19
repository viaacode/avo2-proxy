import { Context, Path, ServiceContext, POST, PreProcessor } from 'typescript-rest';
import * as util from 'util';

import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

import AssetController from './controller';

export type AssetType = 'subtitle' | 'profilePic' | 'image';

export interface UploadAssetInfo { // TODO use typings version
	filename: string;
	content: string;
	mimeType: string;
	type: AssetType; // Used to put the asset inside a folder structure inside the bucket
}

export interface AssetInfo { // TODO use typings version
	url: string;
	id: string;
	type: AssetType; // enum in the database
	objectId: string | number;
}

@Path('/assets')
export default class AssetRoute {
	@Context
	context: ServiceContext;

	/**
	 * Upload a file to the asset server and track it in the asset table in graphql
	 */
	@Path('upload')
	@POST
	// @PreProcessor(isAuthenticated)
	async uploadAsset(
		assetInfo: UploadAssetInfo
	): Promise<AssetInfo> {
		if (!assetInfo || !assetInfo.filename || !assetInfo.content || !assetInfo.type) {
			throw new BadRequestError('the body must contain the filename, content and type (\'subtitle\' | \'profilePic\' | \'image\')');
		}

		try {
			return await AssetController.upload(assetInfo);
		} catch (err) {
			const error = new InternalServerError('Failed to upload file to asset server', err, { assetInfo });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
