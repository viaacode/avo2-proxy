import connectRedis from 'connect-redis';
import session from 'express-session';
import cron from 'node-cron';
import redis from 'redis';

import { checkRequiredEnvs } from '../helpers/env-check';
import { CustomError } from '../helpers/error';
import { logger } from '../helpers/logger';

const sessionConfig: session.SessionOptions = {
	resave: false, // Postgres session provider doesn't need to resave the session every time
	saveUninitialized: true, // Do not create a session for users that are not logged in, neither for health checks
	cookie: {
		secure: false, // TODO make secure once app runs on https: https://www.npmjs.com/package/express-session#cookiesecure
		httpOnly: false,
		maxAge: parseInt(process.env.COOKIES_MAXAGE as string, 10) || 24 * 60 * 60 * 1000, // 24h
	},
	secret: process.env.COOKIES_SECRET || '',
};

if (process.env.NODE_ENV !== 'local') {
	// Use the redis database as session storage
	checkRequiredEnvs([
		'COOKIES_SECRET',
		'REDIS_CONNECTION_STRING',
	]);

	const redisStore = connectRedis(session);
	const redisClient = redis.createClient({
		url: process.env.REDIS_CONNECTION_STRING,
	});

	// Clear sessions stored in redis every day at 05:00
	/* istanbul ignore next */
	cron.schedule('0 0 05 * * *', async () => {
		redisClient.flushdb((err: Error | null, response?: 'OK') => {
			if (err) {
				logger.error(new CustomError('Failed to clear redis session cache', err));
			}
			logger.info('clear session cache response: ', response);
		});
	}, {
		scheduled: true,
		timezone: 'Europe/Brussels',
	}).start();

	sessionConfig.store = new redisStore({ client: redisClient });
}

export default session(sessionConfig);
