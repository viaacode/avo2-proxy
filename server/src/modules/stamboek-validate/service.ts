import axios, { AxiosResponse } from 'axios';
import { CustomError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

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

if (!process.env.STAMBOEK_VERIFY_ENDPOINT) {
	logger.error('VIDEO_STILLS_ENDPOINT env variable is not set');
}

if (!process.env.STAMBOEK_VERIFY_TOKEN) {
	logger.error('STAMBOEK_VERIFY_TOKEN env variable is not set');
}

export default class StamboekService {
	/**
	 * Checks if the stamboek number is valid against the api of klasse
	 * @param stamboekNumber
	 */
	public static async validate(stamboekNumber: string): Promise<boolean> {
		let url: string;
		try {
			if (!process.env.STAMBOEK_VERIFY_ENDPOINT) {
				throw new CustomError(
					'STAMBOEK_VERIFY_ENDPOINT env variable is not set',
					null,
					{ STAMBOEK_VERIFY_ENDPOINT: process.env.STAMBOEK_VERIFY_ENDPOINT }
				);
			}
			if (!process.env.STAMBOEK_VERIFY_TOKEN) {
				throw new CustomError(
					'STAMBOEK_VERIFY_TOKEN env variable is not set',
					null,
					{ STAMBOEK_VERIFY_TOKEN: process.env.STAMBOEK_VERIFY_TOKEN }
				);
			}
			url = `${process.env.STAMBOEK_VERIFY_ENDPOINT}/${stamboekNumber}?token=${process.env.STAMBOEK_VERIFY_TOKEN}`;
			const response: AxiosResponse<ValidationResponse> = await axios(url, {
				method: 'get',
				headers: {
					Authorization: `Basic ${process.env.VIDEO_STILLS_AUTHORIZATION_TOKEN}`,
				},
			});
			return !!response.data.found;
		} catch (err) {
			throw new CustomError(
				'Failed to get player-token from player-token service',
				err,
				{
					url,
				});
		}
	}
}
