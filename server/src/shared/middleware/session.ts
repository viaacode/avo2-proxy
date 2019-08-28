import session from 'express-session';

// TODO store sessions in redis instance provided by VIAA

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
