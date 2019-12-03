import { IRequest, IResponse, INext, IInternalServerError } from '../../../shared/shared.types';
import _ from 'lodash';

export class ErrorMiddleware {
	public static handleError(err: string | Error | IInternalServerError | null | undefined, req: IRequest, res: IResponse, next: INext): IResponse | void {
		if (res.headersSent) { // important to allow default error handler to close connection if headers already sent
			return next(err);
		}
		res.set('Content-Type', 'application/json');
		res.status(_.get(err, 'statusCode', 500));
		res.json({
			message: _.get(err, 'message', ''),
			stack: _.get(err, 'stack', '').split('\n'),
			statusCode: _.get(err, 'statusCode', 500),
			name: _.get(err, 'name', ''),
			additionalInfo: _.get(err, 'additionalInfo', null),
		});
	}
}
