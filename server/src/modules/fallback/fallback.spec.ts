import { default as supertest } from 'supertest';

import { App } from '../../app';

const api = supertest(new App(false).app);

describe('[INTEGRATION - CORE] Fallback route', () => {
	it('Should return the fallback route', (done: jest.DoneCallback) => {
		api.get('/gibberish')
			.then((res: supertest.Response) => {
				expect(res.body.message).toEqual('Route not found');
				expect(res.body.additionalInfo.route).toEqual('/gibberish');
				done();
			})
			.catch(done);
	});
});
