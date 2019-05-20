import { Request } from 'express';

export interface DataRequest extends Request {
	data: {
		body?: any;
		headers?: any;
		params?: any;
		query?: any;
		[key: string]: any;
	};
}
