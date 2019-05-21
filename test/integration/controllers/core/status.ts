const supertest = require('supertest');
import 'jest-extended';
import app from '../../../../src/app';

// API setup
const api = supertest(app);

describe('Server status route', () => {
	it('Should return the server status', () => {
		return api
				.get('/status')
				.then((response) => {
					expect(response.statusCode).toBe(200);
					expect(response.body).toContainKey('success');
					expect(response.body.success).toBeBoolean();
				});
	});
});
