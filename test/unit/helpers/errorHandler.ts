import 'jest-extended';
import errorHandler from '../../../src/helpers/errorHandler';
import { ValidationErr } from '../../../src/helpers/validationError';
import { errorTypes } from '../../../src/middleware/data/errorTypes';

describe('Error handler helper', () => {
	it('Should return an error with stack', () => {
		const err = new TypeError('Random error');
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 400]);
		expect(result).toContainEntry(['msg', 'TypeError occurred. See the stack for more information.']);
		expect(result).toContainKey('stack');
	});

	it('Should return the error when the object validation failed with errors', () => {
		const err = new ValidationErr(errorTypes.ObjectValidationFailed, {
			name: 'Some name.',
			message: 'Some message.',
			isJoi: true,
			details: [{
				message: 'Some error.',
				type: 'Some type.',
				path: ['Some path.'],
			}],
			annotate: () => 'Some annotate.',
			_object: null,
		});
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 400]);
		expect(result).toContainKey('msg');
		expect(result.msg).toBeArrayOfSize(1);
		expect(result.msg[0]).toContainEntry(['err', 'Some error.']);
	});

	it('Should return the error when the object validation failed without errors', () => {
		const err = new ValidationErr(errorTypes.ObjectValidationFailed);
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 400]);
		expect(result).toContainKey('msg');
		expect(result.msg).toBeArrayOfSize(0);
	});

	it('Should return the forbidden error', () => {
		const err = new Error(errorTypes.Forbidden);
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 403]);
		expect(result).toContainEntry(['msg', 'Forbidden.']);
	});

	it('Should return the missing authorization error', () => {
		const err = new Error(errorTypes.MissingAuthorization);
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 401]);
		expect(result).toContainEntry(['msg', 'Not authorized.']);
	});

	it('Should return the item not found error', () => {
		const err = new Error(errorTypes.ItemNotFound);
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 404]);
		expect(result).toContainEntry(['msg', 'Item not found.']);
	});

	it('Should return the default error', () => {
		const err = 'Random error';
		const result = errorHandler(err as any);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 500]);
		expect(result).toContainEntry(['msg', 'Something unexpected happened.']);
	});

	it('Should return the thrown error when not known', () => {
		const err = new Error('Random error');
		const result = errorHandler(err);

		expect(result).toBeObject();
		expect(result).toContainEntry(['statusCode', 500]);
		expect(result).toContainEntry(['msg', 'Random error']);
	});
});
