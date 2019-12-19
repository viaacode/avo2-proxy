import _ from 'lodash';
import getUuid from 'uuid/v1';
import * as path from 'path';

import { BadRequestError } from '../../shared/helpers/error';

import AssetService from './service';
import { AssetInfo, UploadAssetInfo } from './route';

const EXTENSIONS_TO_MIME_TYPE: {[ext: string]: string} = {
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
	public static async upload(uploadAssetInfo: UploadAssetInfo): Promise<AssetInfo> {
		// TODO create asset record in asset table once the table is available in the database
		const parsedFilename = path.parse(uploadAssetInfo.filename);
		const key = `${uploadAssetInfo.type}/${parsedFilename.name}-${getUuid()}${parsedFilename.ext}`;
		const mimeType: string = EXTENSIONS_TO_MIME_TYPE[_.trimStart(parsedFilename.ext, '.')];
		if (!mimeType) {
			throw new BadRequestError('Invalid file extension');
		}
		const url = await AssetService.upload(key, uploadAssetInfo.content, mimeType);
		return {
			url,
			id: '',
			objectId: '',
			type: 'image',
		};
	}
}
