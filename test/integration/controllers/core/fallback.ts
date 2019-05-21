const supertest = require('supertest');
import 'jest-extended';
import app from '../../../../src/app';

// API setup
const api = supertest(app);

describe('Server fallback route', () => {
	it('Should return the fallback route message', () => {
		return api
				.get('/gibberish')
				.then((response) => {
					expect(response.statusCode).toBe(404);
					expect(response.body).toBeObject();
					expect(response.body).toContainEntry(['err', 'Not Found.']);
				});
	});
});
