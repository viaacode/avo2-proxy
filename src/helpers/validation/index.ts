import * as Joi from 'joi';
import { ValidationErr } from '../validationError';
import presets from './presets';

const validator = (preset, onFailError, source) => {
	const validation: any = Joi.validate(source, preset.schema, preset.options);

	if (validation.error) {
		throw new ValidationErr(onFailError, validation.error);
	}

	// Return value from validation, for casting etc
	return validation.value;
};

export {
	validator,
	presets,
};
