import cors from 'cors';
import { get } from 'lodash';

import { logger } from '../../../shared/helpers/logger';
import { jsonStringify } from '../../../shared/helpers/single-line-logging';
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
		res.status(get(err, 'statusCode', 500));

		cors({
			origin: (origin, callback) => {
				callback(null, true);
			},
			credentials: true,
			allowedHeaders:
				'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control',
			methods: 'GET, POST, OPTIONS, PUT, DELETE',
		})(req, res, next);

		let errorJson = jsonStringify(err);
		if (errorJson === '{}' && err) {
			errorJson = jsonStringify({
				message: (err as any).message,
				stack: (err as any).stack,
			});
		}

		logger.error(errorJson);

		res.send(errorJson);
	}
}
