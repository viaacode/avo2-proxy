import AWS, { AWSError, S3 } from 'aws-sdk';
import axios from 'axios';
import _ from 'lodash';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { BadRequestError, CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

interface AssetTokenResponse {
	token: string;
	owner: string;
	scope: string;
	expiration: string; // Timestamp
	creation: string; // Timestamp
	secret: string;
}

const REQUIRED_ASSET_SERVER_VARIABLES = [
	'ASSET_SERVER_ENDPOINT',
	'ASSET_SERVER_TOKEN_ENDPOINT',
	'ASSET_SERVER_TOKEN_SECRET',
	'ASSET_SERVER_TOKEN_USERNAME',
	'ASSET_SERVER_TOKEN_PASSWORD',
	'ASSET_SERVER_BUCKET_NAME',
];

checkRequiredEnvs(REQUIRED_ASSET_SERVER_VARIABLES);

export default class AssetService {
	private static token: AssetTokenResponse | null = null;
	private static s3: S3 | null;

	/**
	 * Returns an s3 client object which contains an up-to-date token to communicate with the s3 server
	 *
	 * A token is requested using this post request:
	 * curl
	 *   -X POST
	 *   -H "X-User-Secret-Key-Meta: myLittleSecret"
	 *   -u avo-qas:*****************
	 *   http://s3-qas.do.viaa.be:88/_admin/manage/tenants/hetarchief-qas/tokens
	 *
	 * Example token:
	 * {
	 * 	"token": "2e2fdbeb1d6df787428964f3574ed4d6",
	 * 	"owner": "avo-qas",
	 * 	"scope": "+hetarchief-qas",
	 * 	"expiration": "2019-12-18T19:10:38.947Z",
	 * 	"creation": "2019-12-17T19:10:38.000Z",
	 * 	"secret": "jWX47N9Sa6v2txQDaD7kyjfXa3gA2m2m"
	 * }
	 */
	private static async getS3Client(): Promise<S3> {
		try {
			const tokenExpiry = new Date(_.get(AssetService, 'token.expiration')).getTime();
			const now = new Date().getTime();
			const fiveMinutes = 5 * 60 * 1000;
			if (!AssetService.token || tokenExpiry - fiveMinutes < now) { // Take 5 minutes margin, to ensure we get a new token well before is expires
				try {
					const response = await axios.post(process.env.ASSET_SERVER_TOKEN_ENDPOINT, undefined, {
						headers: {
							'cache-control': 'no-cache',
							'X-User-Secret-Key-Meta': process.env.ASSET_SERVER_TOKEN_SECRET,
						},
						auth: {
							username: process.env.ASSET_SERVER_TOKEN_USERNAME,
							password: process.env.ASSET_SERVER_TOKEN_PASSWORD,
						},
					});
					AssetService.token = response.data;

					AssetService.s3 = new AWS.S3({
						accessKeyId: AssetService.token.token,
						secretAccessKey: AssetService.token.secret,
						endpoint: `${process.env.ASSET_SERVER_ENDPOINT}/${process.env.ASSET_SERVER_BUCKET_NAME}`,
						s3BucketEndpoint: true,
					});
				} catch (err) {
					throw new ExternalServerError('Failed to get new s3 token for the asset service', err, {});
				}
			}

			return AssetService.s3;
		} catch (err) {
			throw new CustomError('Failed to get s3 client', err, { token: AssetService.token });
		}
	}

	/**
	 * Upload file to the asset service and return the url
	 */
	public static upload(key: string, base64String: string, mimeType: string): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			try {
				checkRequiredEnvs(REQUIRED_ASSET_SERVER_VARIABLES);

				const base64Code = (base64String.split(';base64,').pop() || '').trim();
				if (!base64Code) {
					throw new BadRequestError('Failed to upload file because the base64 code was invalid', null);
				}
				const buffer = new Buffer(base64Code, 'base64');
				const s3Client: S3 = await this.getS3Client();
				s3Client.putObject({
					Key: key,
					Body: buffer,
					ACL: 'public-read',
					ContentType: mimeType,
					Bucket: process.env.ASSET_SERVER_BUCKET_NAME,
				}, (err: AWSError) => {
					if (err) {
						const error = new ExternalServerError(
							'Failed to upload asset to the s3 asset service',
							err);
						logger.error(error);
						reject(error);
					} else {
						resolve(`${process.env.ASSET_SERVER_ENDPOINT}/${process.env.ASSET_SERVER_BUCKET_NAME}/${key}`);
					}
				});
			} catch (err) {
				const error = new InternalServerError(
					'Failed to upload asset to the asset service',
					err,
					{
						key,
						mimeType,
						startOfFile: base64String.substring(0, 50),
					});
				logger.error(error);
				reject(error);
			}
		});
	}

	public static delete(url: string) {
		return new Promise<void>(async (resolve, reject) => {
			try {
				const s3Client: S3 = await this.getS3Client();
				s3Client.deleteObject({
					Key: url.split(`/${process.env.ASSET_SERVER_BUCKET_NAME}/`).pop(),
					Bucket: process.env.ASSET_SERVER_BUCKET_NAME,
				}, (err: AWSError) => {
					if (err) {
						const error = new ExternalServerError(
							'Failed to delete asset from the s3 asset service',
							err,
							{
								url,
							});
						logger.error(error);
						reject(error);
					} else {
						resolve();
					}
				});
			} catch (err) {
				reject(err);
			}
		});
	}
}
