import { default as bodyParser } from 'body-parser';
import { default as cookieParser } from 'cookie-parser';
import { Application } from 'express';
import useragent from 'express-useragent';
import { default as helmet } from 'helmet';

import session from '../../../shared/middleware/session';

import cors from './cors';

export class GlobalMiddleware {
	public static load(app: Application): void {
		app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
		app.use(bodyParser.json({ limit: '50mb' }));

		app.use(cookieParser());

		app.use(helmet.hidePoweredBy());
		app.use(helmet.ieNoOpen());
		app.use(helmet.noSniff());
		app.use(helmet.xssFilter());

		app.use(session);
		app.use(useragent.express());
		app.use(cors);
	}
}
