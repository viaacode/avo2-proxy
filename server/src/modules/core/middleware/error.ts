import { CustomError, BodyError, HeadersError, ParamsError, QueryError } from '@shared/helpers/error';
import { IRequest, IResponse, INext, ICustomError } from '@shared/shared.types';
import { ValidationError } from '@shared/helpers/validation/error';
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
		if (err instanceof Error) {
			err = new CustomError(err.message, err); // tslint:disable-line no-parameter-reassignment
		}

		return res.status(_.get(err, 'innerException.statusCode') || err.status).json({
			host: err.host,
			identifier: err.identifier,
			timestamp: err.timestamp,
			status: _.get(err, 'innerException.statusCode') || _.get(err, 'innerException.status') || err.status,
			name: _.get(err, 'innerException.name') || err.name,
			message: _.get(err, 'innerException.message') || err.message,
			details: err.details, // Optional
			stack: _.get(err, 'innerException.stack') || err.stack || [], // Optional and only on local or test environment
		});
	}
}
