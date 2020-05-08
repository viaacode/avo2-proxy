import _ from 'lodash';

import { logger } from '../../../shared/helpers/logger';
import { IInternalServerError, INext, IRequest, IResponse } from '../../../shared/shared.types';

export class ErrorMiddleware {
	public static handleError(err: string | Error | IInternalServerError | null | undefined, req: IRequest, res: IResponse, next: INext): IResponse | void {
		if (res.headersSent) { // important to allow default error handler to close connection if headers already sent
			return next(err);
		}
		res.set('Content-Type', 'application/json');
		res.status(_.get(err, 'statusCode', 500));
		logger.error(JSON.stringify(err, null, 2));
		res.send(JSON.stringify(err, null, 2));
	}
}
