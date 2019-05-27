import { Application } from 'express';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as helmet from 'helmet';
import session from './session';

export default (app: Application): void => {
	app.use(cookieParser());

	app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
	app.use(bodyParser.json({ limit: '50mb' }));

	app.use(session);

	app.use(helmet.xssFilter());
	app.use(helmet.noSniff());
	app.use(helmet.ieNoOpen());
	app.use(helmet.hidePoweredBy());
};
