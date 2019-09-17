import { CustomError, BodyError, HeadersError, ParamsError, QueryError } from '../../../shared/helpers/error';
import { IRequest, IResponse, INext, ICustomError } from '../../../shared/shared.types';
import { ValidationError } from '../../../shared/helpers/validation/error';
import * as _ from 'lodash';

export class ErrorMiddleware {
	public static handleError(err: string | Error | ICustomError | null | undefined, req: IRequest, res: IResponse, next: INext): IResponse | void {
		if ((err as any).statusCode) {
			res.status((err as any).statusCode).json(JSON.stringify(err, null, 2));
			return;
		}

		// Check if there is an error
		if (!err) {
			return next();
		}

		// Prevent sending multiple responses
		if (res.headersSent) {
			return next();
		}

		// Convert a string to an Error object
		if (typeof err === 'string') {
			err = new Error(err); // tslint:disable-line no-parameter-reassignment
		}

		// Convert a ValidationError object to a CustomError object
		if (err instanceof Error && err.name === 'ValidationError') {
			switch (err.message) {
				case 'body':
					err = new BodyError(err as ValidationError); // tslint:disable-line no-parameter-reassignment
					break;
				case 'headers':
					err = new HeadersError(err as ValidationError); // tslint:disable-line no-parameter-reassignment
					break;
				case 'params':
					err = new ParamsError(err as ValidationError); // tslint:disable-line no-parameter-reassignment
					break;
				case 'query':
					err = new QueryError(err as ValidationError); // tslint:disable-line no-parameter-reassignment
					break;
			}
		}

		// Convert an Error object to a CustomError object
		let error: ICustomError = err as ICustomError;
		if (err instanceof Error) {
			error = new CustomError(err.message, err); // tslint:disable-line no-parameter-reassignment
		}

		return res.status(_.get(error, 'innerException.statusCode') || error.status).json({
			host: error.host,
			identifier: error.identifier,
			timestamp: error.timestamp,
			status: _.get(error, 'innerException.statusCode') || _.get(error, 'innerException.status') || error.status,
			name: _.get(error, 'innerException.name') || error.name,
			message: _.get(error, 'innerException.message') || error.message,
			details: error.details, // Optional
			stack: _.get(error, 'innerException.stack') || error.stack || '', // Optional and only on local or test environment
		});
	}
}
