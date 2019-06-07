import { Response, NextFunction } from 'express';
import { DataRequest } from '../middleware.types';
import { validator } from '../../helpers/validation';
import { errorTypes } from './errorTypes';

const validate = (options: {
	origin: string,
	preset: any, // TODO: fix any types if possible
	error: string | undefined,
	req: DataRequest,
	res: Response,
	next: NextFunction,
}): void => {
	// Set default validation error when not provided
	if (!options.error) {
		options.error = errorTypes.ObjectValidationFailed;
	}
	options.req.data[options.origin] = validator(options.preset, options.error, options.req.data[options.origin]);
	options.next();
};

export default validate;
