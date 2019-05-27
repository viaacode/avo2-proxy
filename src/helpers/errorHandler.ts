import * as _ from 'lodash';
import { errorTypes } from '../middleware/data/errorTypes';

const errorHandler = (err: Error): {
	statusCode: number;
	msg: string;
	stack?: string[];
} => {
	let statusCode: number;
	let msg: string = '';

	// If the err name is defined, we should not check for our own custom errors
	if (err.name && err.name !== 'Error' && err.name !== 'ValidationErr' && !_.startsWith(err.name, 'default_')) {
		statusCode = 400;
		msg = `${err.name} occurred. See the stack for more information.`;

		return { statusCode, msg, stack: (err.stack || '').split(/\r?\n/) };
	}

	// Get the correct message
	switch (err.message) {
		case errorTypes.ObjectValidationFailed:
			statusCode = 400;
			msg = (_.get(err, 'validation.details') || []).map((detail) => {
				return {
					err: detail.message,
				};
			});
			break;
		case errorTypes.MissingAuthorization:
			statusCode = 401;
			msg = 'Not authorized.';
			break;
		case errorTypes.Forbidden:
			statusCode = 403;
			msg = 'Forbidden.';
			break;
		case errorTypes.ItemNotFound:
			statusCode = 404;
			msg = 'Item not found.';
			break;

		default:
			statusCode = 500;
			msg = err.message || 'Something unexpected happened.';
	}

	return { statusCode, msg };
};

export default errorHandler;
