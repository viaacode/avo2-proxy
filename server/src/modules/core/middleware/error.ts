import cors from 'cors';
import _ from 'lodash';
import * as util from 'util';

import { logger } from '../../../shared/helpers/logger';
import { IInternalServerError, INext, IRequest, IResponse } from '../../../shared/shared.types';

export class ErrorMiddleware {
	public static handleError(
		err: string | Error | IInternalServerError | null | undefined,
		req: IRequest,
		res: IResponse,
		next: INext
	): IResponse | void {
		if (res.headersSent) {
			// important to allow default error handler to close connection if headers already sent
			return next(err);
		}
		res.set('Content-Type', 'application/json');
		res.status(_.get(err, 'statusCode', 500));

		logger.error(util.inspect(err));

		cors({
			origin: (origin, callback) => {
				callback(null, true);
			},
			credentials: true,
			allowedHeaders:
				'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control',
			methods: 'GET, POST, OPTIONS, PUT, DELETE',
		})(req, res, next);

		res.send(JSON.stringify(err, null, 2));
	}
}
