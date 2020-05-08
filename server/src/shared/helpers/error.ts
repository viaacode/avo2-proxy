import { ValidationErrorItem } from '@hapi/joi';
import { pathOr } from 'ramda';
import { default as uuid } from 'uuid';

import { default as config } from '../../config';
import { IInternalServerErrorDetail, IValidationError } from '../shared.types';

export class CustomError {
	public message: string;
	public innerException: any | null;
	public additionalInfo: any | null;
	public details?: IInternalServerErrorDetail[];
	public host: string = config.server.host;
	public identifier: string = uuid();
	public name: string = 'Error';
	public stack: string;
	public statusCode: number = 500;
	public timestamp: string = new Date().toISOString();

	constructor(
		message: string = 'Something went wrong',
		innerException: any = null,
		additionalInfo: any = null) {
		this.message = message;
		this.innerException = innerException;
		this.additionalInfo = additionalInfo;
		Error.captureStackTrace(this, this.constructor);

		if (innerException && typeof innerException.stack === 'string') {
			this.stack = innerException.stack;
		} else {
			this.stack = new Error().stack || '';
		}
	}

	public toString(): string {
		return JSON.stringify(
			this,
			(key, value) => {
				if (key === 'request') {
					// Avoid huge request object in error json
					return '[request]';
				}
				return value;
			},
			2);
	}
}

export class CustomValidationError extends CustomError {
	public message: string = 'Invalid object';
	public name: string = 'Bad Request';
	public statusCode: number = 400;

	constructor(err: IValidationError) {
		super();

		this.details = pathOr([], ['validation', 'details'], err).map((detail: ValidationErrorItem) => ({
			err: detail.message,
		}));
	}
}

export class BodyError extends CustomValidationError {
	// public message: string = 'Invalid body';
}

export class HeadersError extends CustomValidationError {
	// public message: string = 'Invalid headers';
}

export class ParamsError extends CustomValidationError {
	// public message: string = 'Invalid params';
}

export class QueryError extends CustomValidationError {
	// public message: string = 'Invalid query';
}

export class TypeError extends CustomError {
	// public message: string = 'Type error';
	public name: string = 'TypeError';
	public statusCode: number = 500;
}

export class ClientError extends CustomError {
	public name: string = 'ClientError';
	public statusCode: number = 400;
}

export class UnauthorizedError extends ClientError {
	// public message: string = 'Missing authorization';
	public name: string = 'Unauthorized';
	public statusCode: number = 401;
}

export class BadRequestError extends ClientError {
	// public message: string = 'Bad request';
	public name: string = 'BadRequest';
	public statusCode: number = 400;
}

export class ForbiddenError extends ClientError {
	// public message: string = 'Not allowed';
	public name: string = 'Forbidden';
	public statusCode: number = 403;
}

export class NotFoundError extends ClientError {
	// public message: string = 'Resource not found';
	public name: string = 'NotFound';
	public statusCode: number = 404;
}

export class ConflictError extends ClientError {
	// public message: string = 'The request could not be completed due to a conflict with the current state of the target resource';
	public name: string = 'Conflict';
	public statusCode: number = 409;
}

export class GoneError extends ClientError {
	// public message: string = 'Access to the target resource is no longer available at the origin server and that this condition is likely to be permanent';
	public name: string = 'Gone';
	public statusCode: number = 410;
}

export class ServerError extends CustomError {}

export class InternalServerError extends ServerError {
	// public message: string = 'Something went wrong';
	public name: string = 'InternalServerError';
	public statusCode: number = 500;
}

export class ExternalServerError extends ServerError {
	// public message: string = 'Something went wrong';
	public name: string = 'ExternalServerError';
	public statusCode: number = 500;
}
