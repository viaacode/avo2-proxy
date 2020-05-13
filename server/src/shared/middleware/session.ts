import connectRedis from 'connect-redis';
import session from 'express-session';
import cron from 'node-cron';
import redis from 'redis';

import { checkRequiredEnvs } from '../helpers/env-check';

const sessionConfig: session.SessionOptions = {
	resave: false, // Postgres session provider doesn't need to resave the session every time
	saveUninitialized: true, // Do not create a session for users that are not logged in, neither for health checks
	cookie: {
		secure: false, // TODO make secure once app runs on https: https://www.npmjs.com/package/express-session#cookiesecure
		httpOnly: false,
		maxAge: parseInt(process.env.COOKIES_MAXAGE as string, 10) || 4 * 60 * 60 * 1000, // 4h
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

	sessionConfig.store = new redisStore({ client: redisClient });
}

export default session(sessionConfig);
