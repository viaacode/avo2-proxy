import { Response, NextFunction } from 'express';
import { DataRequest } from '../middleware.types';
import { clone } from 'ramda';

export default function (req: DataRequest, res: Response, next: NextFunction): void {
	req.data = {
		body: clone(req.body),
		headers: clone(req.headers),
		params: clone(req.params),
		query: clone(req.query),
	};
	next();
}
