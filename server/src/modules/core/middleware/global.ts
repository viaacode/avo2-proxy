import { default as bodyParser } from 'body-parser';
import { default as cookieParser } from 'cookie-parser';
import { Application } from 'express';
import useragent from 'express-useragent';
import { default as helmet } from 'helmet';
import multer from 'multer';

import session from '../../../shared/middleware/session';
import AssetController from '../../assets/assets.controller';

import cors from './cors';

export const tempFolder = process.env.TEMP_ASSET_FOLDER || '/tmp';

export class GlobalMiddleware {
	public static load(app: Application): void {
		app.use(cors);

		app.use(
			multer({
				dest: tempFolder,
				limits: {
					fileSize: 200000000,
				},
				fileFilter: (req, file, cb) => cb(null, AssetController.isValidFileType(file)),
			}).any()
		); // 200MB

		app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
		app.use(bodyParser.json({ limit: '50mb' }));

		app.use(cookieParser());

		app.use(helmet.hidePoweredBy());
		app.use(helmet.ieNoOpen());
		app.use(helmet.noSniff());
		app.use(helmet.xssFilter());

		app.use(session);
		app.use(useragent.express());
	}
}
