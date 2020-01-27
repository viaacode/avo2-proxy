import { AddressInfo } from 'net';
import { default as express, Application, Request, Response, NextFunction } from 'express';
import * as http from 'http';

import { default as config } from './config';
import { GlobalMiddleware } from './modules/core/middleware/global';
import { IConfig } from './config/config.types';
import { logger, logIfNotTestEnv } from './shared/helpers/logger';
import { presets as corePresets } from './modules/core/helpers/presets';
import { Validator } from './shared/helpers/validation';
import { Server } from 'typescript-rest';
import { ErrorMiddleware } from './modules/core/middleware/error';
import OrganizationService from './modules/organization/service';
import HetArchiefService from './modules/auth/idps/hetarchief/service';
import SmartschoolService from './modules/auth/idps/smartschool/service';
import ZendeskService from './modules/zendesk/service';

// Routes
import AuthRoute from './modules/auth/route';
import HetArchiefRoute from './modules/auth/idps/hetarchief/route';
import SmartschoolRoute from './modules/auth/idps/smartschool/route';
import ZendeskRoute from './modules/zendesk/route';
import AssetRoute from './modules/assets/route';
import StatusRoute from './modules/status/route';
import SearchRoute from './modules/search/route';
import DataRoute from './modules/data/route';
import ProfileRoute from './modules/profile/route';
import NavigationItemsRoute from './modules/navigation-items/route';
import PlayerTicketRoute from './modules/player-ticket/route';
import StamboekRoute from './modules/stamboek-validate/route';
import VideoStillsRoute from './modules/video-stills/route';
import EventLoggingRoute from './modules/event-logging/route';
import EducationOrganizationsRoute from './modules/education-organizations/route';

// This route must be imported as the last route, otherwise it will resolve before the other routes
import FallbackRoute from './modules/fallback/route';
import CampaignMonitorRoute from './modules/campaign-monitor/route';

export class App {
	public app: Application = express();
	public config: IConfig = CONFIG;
	public server: http.Server;

	constructor(start: boolean = true) {
		Validator.validate(process.env, corePresets.env, 'Invalid environment variables');

		// One time initialization of objects needed for operation of the api
		OrganizationService.initialize();
		HetArchiefService.initialize();
		SmartschoolService.initialize();
		ZendeskService.initialize();

		this.loadMiddleware();
		this.loadModules();
		this.loadErrorHandling();

		if (start) {
			this.start();
		}
	}

	public start(): void {
		this.server = this.app.listen(this.config.server.port, (err?: Error) => {
			if (err) {
				logger.error(err);
				return process.exit(1);
			}

			logIfNotTestEnv(`Server running on ${this.config.state.env} environment at port ${(this.server.address() as AddressInfo).port}`);
		});
	}

	public stop(signal: NodeJS.Signals): void {
		logger.info(`Server stopped due to ${signal} signal, graceful shutdown`);
		this.server.close((err?: Error) => {
			if (err) {
				logger.error(err);
				return process.exit(1);
			}

			process.exit();
		});
	}

	private loadMiddleware(): void {
		GlobalMiddleware.load(this.app);

		/**
		 * Temp route rewrite to change /auth to /auth/hetarchief, so we can keep all the idp providers uniform
		 */
		this.app.use((req: Request, res: Response, next: NextFunction) => {
			req.url = req.url.replace(/^\/auth\/login($|\?)/, '/auth/hetarchief/login$1');
			req.url = req.url.replace(/^\/auth\/login-callback($|\?)/, '/auth/hetarchief/login-callback$1');
			req.url = req.url.replace(/^\/auth\/logout($|\?)/, '/auth/hetarchief/logout$1');
			req.url = req.url.replace(/^\/auth\/logout-callback($|\?)/, '/auth/hetarchief/logout-callback$1');
			next();
		});
		// if (this.config.state.docs) {
		// 	SwaggerMiddleware.load(this.app, {
		// 	});
		// }
	}

	private loadModules(): void {
		// register routes using typescript-rest
		Server.ignoreNextMiddlewares(true);
		Server.buildServices(
			this.app,
			StatusRoute,

			AuthRoute,
			HetArchiefRoute,
			SmartschoolRoute,

			EducationOrganizationsRoute,
			SearchRoute,
			DataRoute,
			ProfileRoute,
			NavigationItemsRoute,
			PlayerTicketRoute,
			VideoStillsRoute,
			StamboekRoute,
			EventLoggingRoute,
			ZendeskRoute,
			AssetRoute,
			CampaignMonitorRoute,

			FallbackRoute,
		);
	}

	private loadErrorHandling(): void {
		this.app.use(ErrorMiddleware.handleError);
	}
}

export const CONFIG: IConfig = config;
