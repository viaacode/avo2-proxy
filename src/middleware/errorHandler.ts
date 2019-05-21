import { Request, Response, NextFunction } from 'express';
import ErrorHelper from '../helpers/errorHandler';

const errorHandler = (err?: string | Error, req?: Request, res?: Response, next?: NextFunction): void => {
	// Check if there is an error
	if (!err) {
		next();
	}

	// Check if the error is of type string
	// If so, "convert" it to an error
	let error: Error;
	if (typeof err === 'string') {
		error = new Error(err);
	} else {
		error = err;
	}

	// Do not send multiple responses
	// Do not attempt to send anything if res was not passed
	if (!res || res.headersSent) {
		return;
	}

	const { statusCode, msg, stack } = ErrorHelper(error);

	// Return response
	res.status(statusCode).json({
		stack, // Stack is optional. Will only be available if the stack is defined.,
		err: msg,
	});
};

export default errorHandler;
