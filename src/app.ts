import environment from './helpers/environment';

environment(process.env);

import { AddressInfo } from 'net';
import cors from 'cors';
import errorHandler from './middleware/errorHandler';
import express from 'express';
import FallbackRoute from './modules/fallback/route';
import global from './middleware/global';
import { Logger } from './helpers/logger';
import { Server, Errors } from 'typescript-rest';
import StatusRoute from './modules/status/route';
import SearchRoute from './modules/search/route';

const app: express.Application = express();
global(app);
app.use(errorHandler);
app.use(cors());

// register routes using typescript-rest
Server.ignoreNextMiddlewares(true);
Server.buildServices(
	app,
	StatusRoute,
	SearchRoute,
);

// Register the docs route
Server.swagger(app, {
	endpoint: 'docs/',
	filePath: './docs/swagger.json',
	host: 'localhost:3000',
	schemes: ['http'],
});

// Return 404 if route is not knwon
Server.buildServices(
	app,
	FallbackRoute,
);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	if (err instanceof Errors.NotFoundError) {
		res.set('Content-Type', 'application/json');
		res.status(err.statusCode);
		res.json({ error: 'Route not found' });
	} else {
		next(err);
	}
});

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
