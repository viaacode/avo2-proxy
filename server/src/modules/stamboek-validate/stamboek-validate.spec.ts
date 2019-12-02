import 'jest';
import supertest from 'supertest';
import { App } from '../../app';

const api = supertest(new App(false).app);

const VALID_STAMBOEK_NUMBER_1 = '18505250273-000010';
const VALID_STAMBOEK_NUMBER_2 = '18505250273';
const INVALID_STAMBOEK_NUMBER_1 = '34567';
const INVALID_STAMBOEK_NUMBER_2 = '28196180842';

describe('Stamboek number', () => {
	it('should throw an error if no stamboek number are passed', async () => {
		const response = await api
			.get('/stamboek/validate');
		expect(response.body.message).toEqual('query param stamboekNumber is required');
	});

	it('should return true for a valid stamboek number', async () => {
		const response = await api
			.get('/stamboek/validate')
			.query({
				stamboekNumber: VALID_STAMBOEK_NUMBER_1,
			});
		expect(response.body).toBeObject();
		expect(response.body).toContainAllKeys(['status']);
		expect(response.body.status).toEqual('VALID');
	});

	it('should return true for a valid teacher card number', async () => {
		const response = await api
			.get('/stamboek/validate')
			.query({
				stamboekNumber: VALID_STAMBOEK_NUMBER_2,
			});
		expect(response.body).toBeObject();
		expect(response.body).toContainAllKeys(['status']);
		expect(response.body.status).toEqual('VALID');
	});

	it('should return false for an invalid stamboek number too short', async () => {
		const response = await api
			.get('/stamboek/validate')
			.query({
				stamboekNumber: INVALID_STAMBOEK_NUMBER_1,
			});
		expect(response.body).toBeObject();
		expect(response.body).toContainAllKeys(['status']);
		expect(response.body.status).toEqual('INVALID');
	});

	it('should return false for an invalid stamboek number correct length but invalid', async () => {
		const response = await api
			.get('/stamboek/validate')
			.query({
				stamboekNumber: INVALID_STAMBOEK_NUMBER_2,
			});
		expect(response.body).toBeObject();
		expect(response.body).toContainAllKeys(['status']);
		expect(response.body.status).toEqual('INVALID');
	});
});
