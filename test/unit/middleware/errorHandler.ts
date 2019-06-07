import { Request, Response, NextFunction } from 'express';
import 'jest-extended';
import errorHandler from '../../../src/middleware/errorHandler';

describe('Error handler middleware', () => {
	it('Should skip if there is no error', () => {
		errorHandler(undefined, undefined, undefined, (err) => {
			expect(err).toBeUndefined();
		});
	});

	it('Should return a custom error message', () => {
		const err = {
			message: 'Custom error message',
		};
		const req = {};
		const res = {
			status: (statusCode) => {
				expect(statusCode).toBe(500);

				return {
					json: (body) => {
						expect(body).toBeObject();
						expect(body).toContainEntry(['err', err.message]);
					},
				};
			},
		};

		const next = errorHandler;

		errorHandler(err as Error, req as Request, res as Response, next as NextFunction);
	});

	it('Should do nothing when the headers are already sent', () => {
		const errorMessage = 'Some error message';
		const req = {};
		const res = {
			headersSent: true,
			status: (statusCode) => {
				expect(statusCode).toBe(500);

				return {
					json: (body) => {
						expect(body).toBeObject();
						expect(body).toContainEntry(['err', errorMessage]);
					},
				};
			},
		};

		const next = errorHandler;

		const result = errorHandler(errorMessage, req as Request, res as Response, next as NextFunction);

		expect(result).toBeUndefined();
	});
});
