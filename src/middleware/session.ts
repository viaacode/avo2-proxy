import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { RecursiveError } from '../helpers/recursiveError';

// Setup session store in postgres db
const pgPool = new pg.Pool({});
const pgSession = connectPgSimple(session);
if (!process.env.COOKIES_SECRET) {
	console.error(new RecursiveError('COOKIES_SECRET env variable is required'));
}
// export default session({
// 	store: new pgSession({
// 		pool: pgPool,
// 		schemaName: 'app',
// 		tableName : 'session',
// 	}),
// 	resave: false, // Postgres session provider doesn't need to resave the session every time
// 	saveUninitialized: true, // Do not create a session for users that are not logged in, neither for health checks
// 	cookie: {
// 		secure: false, // TODO make secure once app runs on https: https://www.npmjs.com/package/express-session#cookiesecure
// 		httpOnly: false,
// 		maxAge: parseInt(process.env.COOKIES_MAXAGE as string, 10),
// 	},
// 	secret: process.env.COOKIES_SECRET || '',
// });

export default session({
	resave: false, // Postgres session provider doesn't need to resave the session every time
	saveUninitialized: true, // Do not create a session for users that are not logged in, neither for health checks
	cookie: {
		secure: false, // TODO make secure once app runs on https: https://www.npmjs.com/package/express-session#cookiesecure
		httpOnly: false,
		maxAge: parseInt(process.env.COOKIES_MAXAGE as string, 10) || 4 * 60 * 60 * 1000, // 4h
	},
	secret: process.env.COOKIES_SECRET || '',
});
