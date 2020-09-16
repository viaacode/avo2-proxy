import cors from 'cors';
import { NextFunction, Request, Response } from 'express';

const WHITE_LIST_DOMAINS = [
	// TODO insert list from env variable + enable using cors callback function
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

export const corsOptions = {
	origin: (origin: string, callback: (err: Error, allow: boolean) => void) => {
		callback(null, true);
	},
	credentials: true,
	allowedHeaders: 'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control',
	methods: 'GET, POST, OPTIONS, PUT, DELETE',
};

export default function(req: Request, res: Response, next: NextFunction) {
	cors(corsOptions)(req, res, next);
}
