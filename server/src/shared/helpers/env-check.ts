import { InternalServerError } from './error';
import { logger } from './logger';

export function checkRequiredEnvs(requiredEnvs: string[]) {
	requiredEnvs.forEach((envVar: string) => {
		if (!process.env[envVar]) {
			logger.error(`Environment variable ${envVar} is required.`);
			throw new InternalServerError(`Environment variable ${envVar} is required.`);
		}
	});
}
