import { NextFunction, Request, Response } from 'express';

export default function (req: Request, res: Response, next: NextFunction) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, authorization, Origin, Accept, cache-control');
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
	// Intercepts OPTIONS method
	if (req.method === 'OPTIONS') {
		// Respond with 200
		res.sendStatus(200);
	} else {
		// Move on
		next();
	}
}

// TODO limit domains to specific list:
// [
// 		'http://localhost:8080',
// 		'http://avo2-client-dev-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-tst-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-qas-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 		'http://avo2-client-prd-sc-avo2.apps.do-prd-okp-m0.do.viaa.be',
// 	]
