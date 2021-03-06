import Joi from '@hapi/joi';

export interface StillRequest { // TODO move to types repo
	externalId: string;
	startTime: number; // milliseconds
}

export const stillRequestValidation = Joi.array().items(
	Joi.object({
		externalId: Joi.string()
			.min(3)
			.required(),

		startTime: Joi.number().min(0),
	})
);
