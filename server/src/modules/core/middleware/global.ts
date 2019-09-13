import { Application } from 'express';
import { default as bodyParser } from 'body-parser';
import { default as cookieParser } from 'cookie-parser';
import { default as helmet } from 'helmet';
import session from '../../../shared/middleware/session';
import useragent from 'express-useragent';
import cors from 'cors';

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
		app.use(cors({
			origin: [
				'http://localhost:8080',
				'http://avo2-client-dev-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
				'http://avo2-client-tst-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
				'http://avo2-client-qas-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
				'http://avo2-client-prd-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
			],
			credentials: true,
		}));
	}
}
