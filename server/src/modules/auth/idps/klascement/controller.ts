import { Request } from 'express';
import { Context, ServiceContext } from 'typescript-rest';

export default class KlascementController {
	@Context
	context: ServiceContext;

	public static isLoggedIn(request: Request): boolean {
		return false;
	}
}
