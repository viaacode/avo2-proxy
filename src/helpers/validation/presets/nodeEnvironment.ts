import * as Joi from 'joi';
import options from './options';

const schema = Joi.object().keys({
	NODE_ENV: Joi.string().required().valid(['local', 'staging', 'production', 'test']),
	FORCE_COLOR: Joi.string().default(1),
});

export default {
	schema,
	options: options.allowUnknown,
};
