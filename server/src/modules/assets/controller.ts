import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'path';
import getUuid from 'uuid/v1';

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError } from '../../shared/helpers/error';
import DataService from '../data/data.service';

import { DELETE_CONTENT_ASSET, INSERT_CONTENT_ASSET } from './queries.gql';
import AssetService from './service';

const VALID_MIME_TYPES: string[] = [
	// images
	'image/png',
	'image/gif',
	'image/jpeg',
	'image/jpeg',
	'image/svg+xml',
	'image/bmp',
	// videos
	'video/mp4',
	'video/webm',
	'video/ogg',
	// audio
	'audio/wav',
	'audio/mpeg',
	'audio/midi',
	'audio/x-midi',
	// subtitles
	'text/srt',
	'image/vnd.dvb.subtitle',
	// txt
	'text/plain',
	// pdf
	'application/pdf',
	// word
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessing',
	// excel
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	// csv
	'text/csv',
	// ppt
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	// zip
	'application/zip',
	'application/vnd.rar',
	'application/x-7z-compressed',
	'application/x-tar',
];

export default class AssetController {
	/**
	 * Upload a file to the asset service and keep a record of the upload in graphql
	 * @param uploadAssetInfo
	 * @param files
	 */
	public static async upload(
		uploadAssetInfo: Avo.FileUpload.UploadAssetInfo,
		files: Express.Multer.File[]
	): Promise<string> {
		const parsedFilename = path.parse(uploadAssetInfo.filename);
		const key = `${uploadAssetInfo.type}/${_.kebabCase(parsedFilename.name)}-${getUuid()}${
			parsedFilename.ext
		}`;
		if (!AssetController.isValidFileType(files[0])) {
			throw new BadRequestError('Invalid file extension');
		}

		// Save meta info in the database so we can find this file when we implement the asset library
		const url = await AssetService.upload(key, files[0], files[0].mimetype);
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

		// Remove temp file from temp folder, since it should be uploaded to the asset server now
		await fs.unlink(files[0].path);

		// Return the url to the file on the asset server
		return url;
	}

	public static isValidFileType(file: Express.Multer.File): boolean {
		return VALID_MIME_TYPES.includes(file.mimetype);
	}

	public static async delete(url: string) {
		await AssetService.delete(url);
		await DataService.execute(DELETE_CONTENT_ASSET, { url });
		return;
	}
}
