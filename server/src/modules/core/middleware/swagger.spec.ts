import { Application, default as express } from 'express';

import { SwaggerMiddleware } from './swagger';

describe('[UNIT - CORE] SwaggerMiddleware (todo)', () => {
	const app: Application = express();

	it('Should load the swagger middleware', (done: jest.DoneCallback) => {
		// SwaggerMiddleware.load(app, {});
		//
		// const middlewares: string[] = app._router.stack.map((layer: any) => layer.name); // tslint:disable-line no-any
		//
		// expect(middlewares).toContainValues([
		// 	'swaggerInitFn',
		// ]);
		done();
	});
});
