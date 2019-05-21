import supertest, { Response } from 'supertest';
import 'jest-extended';
import app from '../../../src/app';

// API setup
const api = supertest(app);

describe('Server docs route', () => {
	it('Should create the server docs successfully', () => {
		return api
				.get('/docs/json')
				.expect((response: Response) => {
					expect(response.status).toBe(200);
					expect(response.body).toBeObject();
					expect(response.body).toContainAllKeys([
						'info',
						'swagger',
						'paths',
						'definitions',
						'responses',
						'parameters',
						'securityDefinitions',
						'tags',
					]);
				});
	});
});
