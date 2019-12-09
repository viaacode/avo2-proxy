import { InternalServerError } from './error';

export function checkRequiredEnvs(requiredEnvs: string[]) {
	requiredEnvs.forEach((envVar: string) => {
		if (!process.env[envVar]) {
			throw new InternalServerError(`Environment variable ${envVar} is required.`);
		}
	});
}
