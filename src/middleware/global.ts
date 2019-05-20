import { Application } from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import session from './session';
import docs = require('@studiohyperdrive/api-docs');

export default (app: Application): void => {
	app.use(cookieParser());

	app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
	app.use(bodyParser.json({ limit: '50mb' }));

	app.use(session);

	app.use(docs({
		path: 'src/modules',
		NODE_ENV: [
			'local',
			'test',
			'staging',
		],
	}));

	app.use(helmet.xssFilter());
	app.use(helmet.noSniff());
	app.use(helmet.ieNoOpen());
	app.use(helmet.hidePoweredBy());
};
