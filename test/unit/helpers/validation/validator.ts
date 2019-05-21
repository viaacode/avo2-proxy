import 'jest-extended';
import Joi from 'joi';
import * as validationHelper from '../../../../src/helpers/validation';

const fixtures = {
	check: {
		schema: Joi.object().keys({
			key: Joi.string().required().valid(['value']),
		}),
		options: {},
	},
};

describe('Validator helper', () => {
	it('Should throw a custom error when the object is not valid', () => {
		const obj = {};

		expect(() => {
			validationHelper.validator(fixtures.check, 'DEFINED_ERROR', obj);
		}).toThrowWithMessage(Error, 'DEFINED_ERROR');
	});

	it('Should return the source when the object is valid', () => {
		const obj = {
			key: 'value',
		};
		const validation = validationHelper.validator(fixtures.check, 'DEFINED_ERROR', obj);

		expect(validation).toBeObject();
		expect(validation).toContainEntry(['key', obj.key]);
	});
});
