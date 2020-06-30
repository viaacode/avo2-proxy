import { Request } from 'express';
import * as _ from 'lodash';

import { IDP_ADAPTERS } from '../../modules/auth/consts';
import { UnauthorizedError } from '../helpers/error';

export function isLoggedIn(req: Request) {
	return _.some(IDP_ADAPTERS, adapter => adapter.isLoggedIn(req));
}

export function isAuthenticatedRouteGuard(req: Request): Request {
	if (!isLoggedIn(req) && process.env.NODE_ENV !== 'test') {
		throw new UnauthorizedError(`You must be logged in for the route ${req.path}`);
	}
	return req;
}

export function checkApiKeyRouteGuard(req: Request): Request {
	const authHeader = req.header('Authorization');
	const token = (authHeader || '').substring('Bearer '.length);

	if (!authHeader || token !== process.env.PROXY_API_KEY) {
		throw new UnauthorizedError(`You must provide a valid api key for the route: ${req.path}`);
	}
	return req;
}
