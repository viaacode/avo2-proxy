import { omit } from 'lodash';
import winston from 'winston';

import { jsonStringify } from './single-line-logging';

const myFormat = winston.format.printf(info => {
	return `${info.timestamp} [${info.level}]: ${jsonStringify(
		omit(info, ['level', 'timestamp'])
	)}`;
});

export const logger = winston.createLogger({
	level: process.env.LOGGING_PRESET || 'verbose',
	format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), myFormat),
	transports: [new winston.transports.Console()],
});

export function logIfNotTestEnv(message: string) {
	if (process.env.NODE_ENV !== 'test') {
		logger.info(message);
	}
}
