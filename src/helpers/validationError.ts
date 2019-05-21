import { ValidationError } from 'joi';
import { mergeDeepRight } from 'ramda';

export class ValidationErr extends Error {
	constructor(public message: string, public validation?: ValidationError) {
		super(message);

		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
	}
}
