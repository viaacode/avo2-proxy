import { Context, Path, ServiceContext, POST, PreProcessor } from 'typescript-rest';
import * as util from 'util';

import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

import AssetController from './controller';

export interface UploadAssetInfo { // TODO use typings version
	filename: string;
	content: string;
	mimeType: string;
}

export interface AssetInfo { // TODO use typings version
	url: string;
	id: string;
	type: number;
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
		if (!assetInfo || !assetInfo.filename || !assetInfo.content || !assetInfo.mimeType) {
			throw new BadRequestError('the body must contain the filename, content and mimeType');
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
