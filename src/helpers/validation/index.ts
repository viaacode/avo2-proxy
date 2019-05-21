import Joi from 'joi';
import { curry } from 'ramda';
import { ValidationErr } from '../validationError';
import presets from './presets';

const validator = curry((preset, onFailError, source) => {
	const validation: any = Joi.validate(source, preset.schema, preset.options);

	if (validation.error) {
		throw new ValidationErr(onFailError, validation.error);
	}

	// Return value from validation, for casting etc
	return validation.value;
});

export {
	validator,
	presets,
};
