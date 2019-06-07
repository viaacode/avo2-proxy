import request from 'supertest';
import 'jest-extended';
import app from '../../../src/app';

// API setup
const api = request(app);

describe('Server docs route', () => {
	it('Should redirect to the service swagger docs', () => {
		return api
			.get('/docs')
			.expect((response: request.Response) => {
				expect(response.status).toBe(301);
				expect(response.header.location).toBe('/docs/');
			});
	});
	it('Should serve the swagger docs', () => {
		return api
			.get('/docs/')
			.expect((response: request.Response) => {
				expect(response.status).toBe(200);
				expect(response.type).toBe('text/html');
				expect(response.text).toContain('<title>Swagger UI</title>');
			});
	});
});
