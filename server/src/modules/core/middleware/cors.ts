import { NextFunction, Request, Response } from 'express';
import cors from 'cors';

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
	'https://hetarchief.be',
	'https://onderwijs.hetarchief.be',
];

export default function (req: Request, res: Response, next: NextFunction) {
	cors({
		origin: (origin, callback) => {
			if (WHITE_LIST_DOMAINS.indexOf(origin) !== -1 || (!origin && (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development'))) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		allowedHeaders: 'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control',
		methods: 'GET, POST, OPTIONS, PUT, DELETE',
	});
	// res.header('Access-Control-Allow-Origin', '*');
	// res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control');
	// res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
	// // Intercepts OPTIONS method
	// if (req.method === 'OPTIONS') {
	// 	// Respond with 200
	// 	res.sendStatus(200);
	// } else {
	// 	// Move on
	// 	next();
	// }
}

// TODO limit domains to specific list:
// [
// 		'http://localhost:8080',
// 		'http://avo2-client-dev-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-tst-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-qas-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-prd-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 	]
