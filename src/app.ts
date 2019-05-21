import environment from './helpers/environment';

environment(process.env);

import express, { Application } from 'express';
import global from './middleware/global';
import errorHandler from './middleware/errorHandler';
import { AddressInfo } from 'net';
import { Logger } from './helpers/logger';
import { Server } from 'typescript-rest';
import StatusRoute from './modules/status/route';
import SearchRoute from './modules/search/route';
import cors from 'cors';

const app: Application = express();
global(app);
app.use(errorHandler);
app.use(cors());
// register routes using typescript-rest
Server.buildServices(app, StatusRoute, SearchRoute);
let server;

// Only start the server if we're not in test mode
if (process.env.NODE_ENV !== 'test') {
	server = app.listen(process.env.PORT, () => {
		Logger.info(`Server listening at port ${(server.address() as AddressInfo).port}, running in ${process.env.NODE_ENV} mode.`);
	});
}

const shutdown = () => {
	Logger.info('Server stopped, graceful shutdown.');
	server.close((err) => {
		if (err) {
			Logger.error('Error:', err);
			process.exitCode = 1;
		}

		process.exit();
	});
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
