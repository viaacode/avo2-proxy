import { Request } from 'express';
import { some } from 'lodash';

import { IDP_ADAPTERS } from '../../modules/auth/consts';
import { IdpHelper } from '../../modules/auth/idp-helper';
import { AuthService } from '../../modules/auth/service';
import { UnauthorizedError } from '../helpers/error';
import { PermissionName } from '../permissions';

type GuardFunction = (req: Request) => Request;

export function multiGuard(...guards: GuardFunction[]): GuardFunction {
	return (req: Request) => {
		guards.forEach((guard) => {
			guard(req);
		});

		return req;
	};
}

export function isLoggedIn(req: Request) {
	return some(IDP_ADAPTERS, (adapter) => adapter.isLoggedIn(req));
}

export function isAuthenticatedRouteGuard(req: Request): Request {
	if (!isLoggedIn(req) && process.env.NODE_ENV !== 'test') {
		throw new UnauthorizedError(`You must be logged in for the route ${req.path}`);
	}
	return req;
}

export function hasPermissionRouteGuard(permission: PermissionName): GuardFunction {
	return (req: Request) => {
		const avoUser = IdpHelper.getAvoUserInfoFromSession(req);
		if (!AuthService.hasPermission(avoUser, permission)) {
			throw new UnauthorizedError(`You must be logged in for the route ${req.path}`);
		}
		return req;
	};
}

export function checkApiKeyRouteGuard(req: Request): Request {
	const authHeader = req.header('Authorization');
	const token = (authHeader || '').substring('Bearer '.length);

	if (!authHeader || token !== process.env.PROXY_API_KEY) {
		throw new UnauthorizedError(`You must provide a valid api key for the route: ${req.path}`);
	}
	return req;
}
