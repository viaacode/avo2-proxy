import { Response } from 'express';
import 'jest-extended';
import copy from '../../../../src/middleware/data/copy';

describe('Copy data middleware', () => {
	it('Should copy all data to req.data', () => {
		const req = {
			body: {
				key: 'body',
			},
			headers: {
				key: 'headers',
			},
			params: {
				key: 'params',
			},
			query: {
				key: 'query',
			},
		} as any; // TODO: take a look if this can be fixed. Request (express) and DataRequest (custom) are too different
		const res = {};

		copy(req, res as Response, () => {
			expect(req.data).toBeDefined();
			expect(req.data).toBeObject();
			expect(req.data).toContainAllKeys([
				'body',
				'headers',
				'params',
				'query',
			]);
			expect(req.data.body.key).toBe('body');
			expect(req.data.headers.key).toBe('headers');
			expect(req.data.params.key).toBe('params');
			expect(req.data.query.key).toBe('query');
		});
	});
});
