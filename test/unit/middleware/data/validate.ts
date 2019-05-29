import * as Joi from 'joi';
import 'jest-extended';
import validate from '../../../../src/middleware/data/validate';
import { errorTypes } from '../../../../src/middleware/data/errorTypes';

describe('Validate data middleware', () => {
	it('Should continue without errors', () => {
		const preset = {
			options: {},
			schema: Joi.object().keys({
				string: Joi.string().required().valid('value'),
				number: Joi.number().required(),
			}),
		};
		const req = {
			data: {
				body: {
					string: 'value',
					number: 1,
				},
			},
		};
		const res = {};

		validate({
			preset,
			req: req as any,
			res: res as any,
			origin: 'data',
			error: errorTypes.ObjectValidationFailed,
			next: (err) => {
				expect(err).toBeUndefined();
				expect(req.data.body).toContainAllKeys([
					'string',
					'number',
				]);
				expect(req.data.body.string).toBeString();
				expect(req.data.body.number).toBeNumber();
			},
		});
	});

	it('Should stop when the validation failed', () => {
		const preset = {
			options: {},
			schema: Joi.object().keys({
				string: Joi.string().required().valid('value'),
			}),
		};
		const req = {
			data: {
				body: {
					value: 'string',
				},
			},
		};
		const res = {};
		const next = () => {
		};

		expect(() => validate({
			preset,
			next,
			req: req as any, // mocked req
			res: res as any, // mocked res
			origin: 'body',
			error: errorTypes.ObjectValidationFailed,
		})).toThrowWithMessage(Error, errorTypes.ObjectValidationFailed);
	});

	it('Should set the default validation failed', () => {
		const preset = {
			options: {},
			schema: Joi.object().keys({
				string: Joi.string().required().valid('value'),
			}),
		};
		const req = {
			data: {
				body: {
					value: 'string',
				},
			},
		};
		const res = {};
		const next = () => {
		};

		expect(() => {
			validate({
				preset,
				next,
				req: req as any,
				res: res as any,
				origin: 'body',
				error: undefined,
			});
		}).toThrowWithMessage(Error, errorTypes.ObjectValidationFailed);
	});
});
