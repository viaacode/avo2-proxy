import { Request } from 'express';

export default class ViaaController {
	public static isLoggedIn(request: Request): boolean {
		return false;
	}
}
