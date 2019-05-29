import session from 'express-session';
import Store from 'session-file-store';

export default session({
	saveUninitialized: true,
	resave: true,
	cookie: {
		secure: false,
		httpOnly: false,
		domain: process.env.COOKIES_DOMAIN || '',
		maxAge: parseInt(process.env.COOKIES_MAXAGE as string, 10),
	},
	name: process.env.COOKIES_NAME,
	secret: process.env.COOKIES_SECRET as string,
	store: new Store(session)({
		path: './.sessions',
	}),
});
