import { ValidationError } from 'joi';

export class ValidationErr extends Error {
	constructor(public message: string, public validation?: ValidationError) {
		super(message);

		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
	}
}
