import { AddressInfo } from 'net';
import { default as express, Application } from 'express';
import * as http from 'http';

import { default as config } from '@config';
import { ErrorMiddleware } from '@modules/core/middleware/error';
import { GlobalMiddleware } from '@modules/core/middleware/global';
import { IConfig } from '@config/config.types';
import { logger } from '@shared/helpers/logger';
import { presets as corePresets } from '@modules/core/helpers/presets';
import { SwaggerMiddleware } from '@modules/core/middleware/swagger';
import { Validator } from '@shared/helpers/validation';
import { Server, Errors } from 'typescript-rest';

import { CoreModule } from '@modules/core';
import OrganizationService from '@modules/organization/service';
import { SampleModule } from '@modules/sample';
import StatusRoute from '@modules/status/route';
import SearchRoute from '@modules/search/route';
import DataRoute from '@modules/data/route';
import AuthRoute from '@modules/auth/route';
import PlayerTicketRoute from '@modules/player-ticket/route';
import FallbackRoute from '@modules/fallback/route';
import { searchModels } from '@modules/search/search.models';

export class App {
	public app: Application = express();
	public config: IConfig = CONFIG;
	public server: http.Server;

	constructor(start: boolean = true) {
		Validator.validate(process.env, corePresets.env, 'Invalid environment variables');

		// Cache organizations every day
		OrganizationService.initialize();

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

			logger.info(`Server running on ${this.config.state.env} environment at port ${(this.server.address() as AddressInfo).port}`);
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
		if (this.config.state.docs) {
			SwaggerMiddleware.load(this.app, {
				...CoreModule.models,
				...SampleModule.models,
			});
		}
	}

	private loadModules(): void {
		// register routes using typescript-rest
		Server.ignoreNextMiddlewares(true);
		Server.buildServices(
			this.app,
			StatusRoute,
			SearchRoute,
			DataRoute,
			AuthRoute,
			PlayerTicketRoute,
			FallbackRoute,
		);
	}

	private loadErrorHandling(): void {
		this.app.use(ErrorMiddleware.handleError);
	}
}

export const CONFIG: IConfig = config;
