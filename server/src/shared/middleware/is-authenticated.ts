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
