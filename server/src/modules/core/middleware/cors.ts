import cors from 'cors';
import { NextFunction, Request, Response } from 'express';

import { logger } from '../../../shared/helpers/logger';

const WHITE_LIST_DOMAINS = [
	'http://localhost:8080',
	'http://avo2-client-dev-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
	'http://avo2-client-int-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
	'http://avo2-client-tst-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
	'http://avo2-client-qas-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
	'http://avo2-client-prd-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
	'https://avo2-client-dev.hetarchief.be',
	'https://avo2-client-int.hetarchief.be',
	'https://avo2-client-tst.hetarchief.be',
	'https://avo2-client-qas.hetarchief.be',
	'https://avo2-client-prd.hetarchief.be',
	'https://avo2-client.hetarchief.be',
	'https://onderwijs.hetarchief.be',
	'https://hetarchief.be',
];

export default function (req: Request, res: Response, next: NextFunction) {
	cors({
		origin: (origin, callback) => {
			callback(null, true);
		},
		credentials: true,
		allowedHeaders: 'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control',
		methods: 'GET, POST, OPTIONS, PUT, DELETE',
	})(req, res, next);
}
