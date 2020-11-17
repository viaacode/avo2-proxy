import _ from 'lodash';
import { Context, DELETE, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types/types/index';

import {
	BadRequestError,
	ClientError,
	InternalServerError,
	UnauthorizedError,
} from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import AssetController from './assets.controller';
import { AuthService } from '../auth/service';
import DataService from '../data/data.service';

@Path('/assets')
export default class AssetRoute {
	@Context
	context: ServiceContext;

	/**
	 * Upload a file to the asset server and track it in the asset table in graphql
	 */
	@Path('upload')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	async uploadAsset(
		assetInfo: Avo.FileUpload.UploadAssetInfo
	): Promise<{ url: string } | BadRequestError> {
		if (!assetInfo || !assetInfo.filename || !assetInfo.type) {
			throw new BadRequestError(
				'the body must contain the filename, content and type (' +
				'\'BUNDLE_COVER\',\'COLLECTION_COVER\',\'CONTENT_PAGE_IMAGE\',\'PROFILE_AVATAR\',\'ITEM_SUBTITLE\''
			);
		}
		if (!this.context.request.files || !this.context.request.files.length) {
			throw new BadRequestError('The request should contain some files to upload');
		}

		try {
			return {
				url: await AssetController.upload(
					assetInfo,
					this.context.request.files as Express.Multer.File[]
				),
			};
		} catch (err) {
			if (err instanceof ClientError) {
				throw new ClientError('Failed to upload file', err, {});
			}
			const error = new InternalServerError('Failed to upload file to asset server', err, {
				...assetInfo,
				content: _.get(assetInfo, 'content', '').substring(0, 50),
			});
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Delete a file from the asset server and remove it from the asset table in graphql
	 */
	@Path('delete')
	@DELETE
	@PreProcessor(isAuthenticatedRouteGuard)
	async deleteAsset(body: { url: string }): Promise<{ status: 'deleted' } | BadRequestError> {
		if (!body || !body.url) {
			throw new BadRequestError(
				'the body must contain the url of the to-be-deleted asset  {url: string}'
			);
		}

		try {
			const avoUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
			if (!avoUser) {
				throw new UnauthorizedError('To delete files you need to be logged in');
			}
			await AssetController.delete(body.url, avoUser);
			return { status: 'deleted' };
		} catch (err) {
			const error = new InternalServerError('Failed to delete asset file', err, { body });
			logger.error(error);
			throw error;
		}
	}
}
