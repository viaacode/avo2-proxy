import { Response, NextFunction } from 'express';
import { DataRequest } from '../middleware.types';
import _ from 'lodash';

export default function (req: DataRequest, res: Response, next: NextFunction): void {
	req.data = {
		body: _.cloneDeep(req.body),
		headers: _.cloneDeep(req.headers),
		params: _.cloneDeep(req.params),
		query: _.cloneDeep(req.query),
	};
	next();
}
