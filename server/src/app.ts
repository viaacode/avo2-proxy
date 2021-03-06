import { Application, default as express, NextFunction, Request, Response } from 'express';
import * as http from 'http';
import { AddressInfo } from 'net';
import { Server } from 'typescript-rest';

import { default as config } from './config';
import { IConfig } from './config/config.types';
import { CustomError } from './shared/helpers/error';
import { logger, logIfNotTestEnv } from './shared/helpers/logger';
import { Validator } from './shared/helpers/validation';

// tslint:disable
// Routes
import { presets as corePresets } from './modules/core/helpers/presets';
import { ErrorMiddleware } from './modules/core/middleware/error';
import { GlobalMiddleware } from './modules/core/middleware/global';
import AssetRoute from './modules/assets/assets.route';
import HetArchiefRoute from './modules/auth/idps/het-archief/het-archief.route';
import HetArchiefService from './modules/auth/idps/het-archief/het-archief.service';
import KlascementRoute from './modules/auth/idps/klascement/route';
import KlascementService from './modules/auth/idps/klascement/service';
import SmartschoolRoute from './modules/auth/idps/smartschool/route';
import SmartschoolService from './modules/auth/idps/smartschool/service';
import DataService from './modules/data/data.service';
import AuthRoute from './modules/auth/route';
import CampaignMonitorRoute from './modules/campaign-monitor/campaign-monitor.route';
import ContentPagesRoute from './modules/content-pages/route';
import DataRoute from './modules/data/data.route';
import EducationLevelsRoute from './modules/education-levels/route';
import EducationOrganizationsRoute from './modules/education-organizations/route';
import EventLoggingRoute from './modules/event-logging/route';
import InteractiveTourRoute from './modules/interactive-tours/route';
import KlaarRoute from './modules/klaar/route';
import NavigationItemsRoute from './modules/navigation-items/route';
import PlayerTicketRoute from './modules/player-ticket/player-ticket.route';
import ProfileRoute from './modules/profile/route';
import SearchRoute from './modules/search/search.route';
import TranslationsRoute from './modules/site-variables/route/translations.route';
import StamboekRoute from './modules/stamboek-validate/route';
import StatusRoute from './modules/status/route';
import VideoStillsRoute from './modules/video-stills/route';
import ZendeskRoute from './modules/zendesk/route';
import OrganisationsRoute from './modules/organization/route';
import CollectionsRoute from './modules/collections/collections.route';
import SitemapRoutes from './modules/sitemap/sitemap.route';
import AssetService from './modules/assets/assets.service';
import OrganisationService from './modules/organization/service';
import ZendeskService from './modules/zendesk/service';
import MamSyncratorRoute from './modules/mam-syncrator/mam-syncrator.route';
import SubtitleRoute from './modules/subtitles/subtitles.route';
import UserRoute from './modules/user/user.route';

// This route must be imported as the last route, otherwise it will resolve before the other routes
import FallbackRoute from './modules/fallback/route';

// tslint:enable

export class App {
	public app: Application = express();
	public config: IConfig = CONFIG;
	public server: http.Server;

	constructor(start: boolean = true) {
		try {
			Validator.validate(process.env, corePresets.env, 'Invalid environment variables');

			// One time initialization of objects needed for operation of the api
			OrganisationService.initialize();
			HetArchiefService.initialize();
			SmartschoolService.initialize();
			KlascementService.initialize();
			ZendeskService.initialize();
			AssetService.initialize();
			DataService.initialize();

			this.loadMiddleware();
			this.loadModules();
			this.loadErrorHandling();

			if (start) {
				this.start();
			}
		} catch (err) {
			throw new CustomError(`Failed to start server: ${JSON.stringify(err)}`);
		}
	}

	public start(): void {
		this.server = this.app.listen(this.config.server.port, (err?: Error) => {
			if (err) {
				logger.error(err);
				return process.exit(1);
			}

			logIfNotTestEnv(
				`Server running on ${this.config.state.env} environment at port ${
					(this.server.address() as AddressInfo).port
				}`
			);
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
			req.url = req.url.replace(
				/^\/auth\/login-callback($|\?)/,
				'/auth/hetarchief/login-callback$1'
			);
			req.url = req.url.replace(/^\/auth\/logout($|\?)/, '/auth/hetarchief/logout$1');
			req.url = req.url.replace(
				/^\/auth\/logout-callback($|\?)/,
				'/auth/hetarchief/logout-callback$1'
			);
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
			KlascementRoute,

			EducationLevelsRoute,
			EducationOrganizationsRoute,
			SearchRoute,
			DataRoute,
			ProfileRoute,
			UserRoute,
			NavigationItemsRoute,
			ContentPagesRoute,
			PlayerTicketRoute,
			VideoStillsRoute,
			StamboekRoute,
			EventLoggingRoute,
			ZendeskRoute,
			AssetRoute,
			CampaignMonitorRoute,
			KlaarRoute,
			TranslationsRoute,
			InteractiveTourRoute,
			OrganisationsRoute,
			CollectionsRoute,
			SitemapRoutes,
			MamSyncratorRoute,
			SubtitleRoute,

			FallbackRoute
		);
	}

	private loadErrorHandling(): void {
		this.app.use(ErrorMiddleware.handleError);
	}
}

export const CONFIG: IConfig = config;
