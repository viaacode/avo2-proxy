import { default as supertest } from 'supertest';

import { App } from '../../app';
import { default as config } from '../../config';
import { logger } from '../../shared/helpers/logger';

const api = supertest(new App(false).app);

describe('[INTEGRATION - CORE] Fallback route', () => {
	it('Should return the fallback route', (done: jest.DoneCallback) => {
		api.get('/gibberish')
			.then((res: supertest.Response) => {
				expect(res.body.message).toEqual('Route not found');
				expect(res.body.additionalInfo.route).toEqual('/gibberish');
				// expect(res.body).toBeObject();
				// expect(res.body).toContainAllKeys([
				// 	'host',
				// 	'identifier',
				// 	'timestamp',
				// 	'status',
				// 	'name',
				// 	'message',
				// 	'stack',
				// ]);
				// expect(res.body.host).toEqual(config.server.host);
				// expect(res.body.identifier).toBeString();
				// expect(res.body.timestamp).toBeString();
				// expect(res.body.statusCode).toEqual(404);
				// expect(res.body.name).toEqual('Not Found');
				// expect(res.body.message).toEqual('Resource not found');
				// expect(res.body.details).toBeUndefined();
				// expect(res.body.stack).toBeString();
				done();
			})
			.catch(done);
	});
});
