import { Context, Path, ServiceContext, POST, PreProcessor, DELETE } from 'typescript-rest';
import * as util from 'util';

import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError, ClientError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';

import AssetController from './controller';

export type AssetType =
	| 'BUNDLE_COVER'
	| 'COLLECTION_COVER'
	| 'CONTENT_PAGE_IMAGE'
	| 'PROFILE_AVATAR'
	| 'ITEM_SUBTITLE';

export interface UploadAssetInfo { // TODO use typings version
	filename: string;
	content: string;
	mimeType: string;
	type: AssetType; // Used to put the asset inside a folder structure inside the bucket
	ownerId: string;
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
	@PreProcessor(isAuthenticated)
	async uploadAsset(
		assetInfo: UploadAssetInfo
	): Promise<{ url: string }> {
		if (!assetInfo || !assetInfo.filename || !assetInfo.content || !assetInfo.type) {
			throw new BadRequestError('the body must contain the filename, content and type (\'subtitle\' | \'profilePic\' | \'image\')');
		}

		try {
			return {
				url: await AssetController.upload(assetInfo),
			};
		} catch (err) {
			if (err instanceof ClientError) {
				// TODO make global error handler that omits stacktraces if client error
				throw new ClientError('Failed to upload file', err, {});
			} else {
				const error = new InternalServerError('Failed to upload file to asset server', err, { assetInfo });
				logger.error(util.inspect(error));
				throw util.inspect(error);
			}
		}
	}

	/**
	 * Delete a file from the asset server and remove it from the asset table in graphql
	 */
	@Path('delete')
	@DELETE
	@PreProcessor(isAuthenticated)
	async deleteAsset(
		body: { url: string }
	): Promise<{ status: 'deleted' }> {
		if (!body || !body.url) {
			throw new BadRequestError('the body must contain the url of the to-be-deleted asset  {url: string}');
		}

		try {
			await AssetController.delete(body.url);
			return { status: 'deleted' };
		} catch (err) {
			const error = new InternalServerError('Failed to delete asset file', err, { body });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
