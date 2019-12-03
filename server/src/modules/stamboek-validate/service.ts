import axios, { AxiosResponse } from 'axios';
import { InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import _ from 'lodash';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';

interface ValidationResponse {
	provided: string;
	found?: {
		stamnummer: string;
		niveau: string;
		lerarenkaartnummer: string;
	};
	quality: string;
	authentication: {
		quality: string;
		message: string;
	};
	status: number;
	message: string;
}

checkRequiredEnvs([
	'STAMBOEK_VERIFY_ENDPOINT',
	'STAMBOEK_VERIFY_TOKEN',
]);

export default class StamboekService {
	/**
	 * Checks if the stamboek number is valid against the api of klasse
	 * @param stamboekNumber
	 */
	public static async validate(stamboekNumber: string): Promise<boolean> {
		let url: string;
		try {
			if (!process.env.STAMBOEK_VERIFY_ENDPOINT) {
				/* istanbul ignore next */
				throw new InternalServerError(
					'STAMBOEK_VERIFY_ENDPOINT env variable is not set',
					null,
					{ STAMBOEK_VERIFY_ENDPOINT: process.env.STAMBOEK_VERIFY_ENDPOINT }
				);
			}
			if (!process.env.STAMBOEK_VERIFY_TOKEN) {
				/* istanbul ignore next */
				throw new InternalServerError(
					'STAMBOEK_VERIFY_TOKEN env variable is not set',
					null,
					{ STAMBOEK_VERIFY_TOKEN: process.env.STAMBOEK_VERIFY_TOKEN }
				);
			}
			url = `${process.env.STAMBOEK_VERIFY_ENDPOINT}/${stamboekNumber}?token=${process.env.STAMBOEK_VERIFY_TOKEN}`;
			const response: AxiosResponse<ValidationResponse> = await axios(url, {
				method: 'get',
			});
			return !!response.data.found;
		} catch (err) {
			const statusCode = _.get(err, 'response.data.status');
			if (statusCode && statusCode < 500 && statusCode >= 400) {
				return false; // Invalid input => invalid stamboek number
			}
			const error = new InternalServerError(
				'Failed to validate the stamboek number through the external api',
				err,
				{
					url,
				});
			logger.error(error);
			throw error;
		}
	}
}
