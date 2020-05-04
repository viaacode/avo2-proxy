import _ from 'lodash';
import getUuid from 'uuid/v1';
import * as path from 'path';

import { BadRequestError } from '../../shared/helpers/error';

import AssetService from './service';
import { UploadAssetInfo } from './route';
import DataService from '../data/service';
import { DELETE_CONTENT_ASSET, INSERT_CONTENT_ASSET } from './queries.gql';

const EXTENSIONS_TO_MIME_TYPE: { [ext: string]: string } = {
	// images
	png: 'image/png',
	gif: 'image/gif',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	// subtitles
	srt: 'text/srt',
	sub: 'image/vnd.dvb.subtitle',
};

export default class AssetController {

	/**
	 * Upload a file to the asset service and keep a record of the upload in graphql
	 * @param uploadAssetInfo
	 */
	public static async upload(uploadAssetInfo: UploadAssetInfo): Promise<string> {
		const parsedFilename = path.parse(uploadAssetInfo.filename);
		const key = `${uploadAssetInfo.type}/${parsedFilename.name}-${getUuid()}${parsedFilename.ext}`;
		const mimeType: string = EXTENSIONS_TO_MIME_TYPE[_.trimStart(parsedFilename.ext, '.').toLowerCase()];
		if (!mimeType) {
			throw new BadRequestError('Invalid file extension');
		}
		const url = await AssetService.upload(key, uploadAssetInfo.content, mimeType);
		const asset = {
			owner_id: uploadAssetInfo.ownerId,
			content_asset_type_id: uploadAssetInfo.type,
			label: url,
			description: null as string | null,
			path: url,
		};
		await DataService.execute(INSERT_CONTENT_ASSET, {
			asset,
		});
		return url;
	}

	public static async delete(url: string) {
		await AssetService.delete(url);
		await DataService.execute(DELETE_CONTENT_ASSET, { url });
		return;
	}
}
