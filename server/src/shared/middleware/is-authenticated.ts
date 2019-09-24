import { Request } from 'express';
import { UnauthorizedError } from 'typescript-rest/dist/server/model/errors';
import AuthController from '../../modules/auth/controller';

export function isAuthenticated(req: Request): Request {
	if (!AuthController.isAuthenticated(req) && process.env.NODE_ENV !== 'test') {
		throw new UnauthorizedError(`You must be logged in for the route ${req.path}`);
	}
	return req;
}
