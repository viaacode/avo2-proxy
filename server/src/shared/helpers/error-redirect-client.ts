import { Return } from 'typescript-rest';
import * as queryString from 'querystring';

export function redirectToClientErrorPage(message: string, icon: string = 'alert-triangle', identifier?: string) {
	return new Return.MovedTemporarily<void>(`${process.env.CLIENT_HOST}/error?${queryString.stringify({
		message,
		icon,
		...(identifier ? { identifier } : {}), // If no hard error object exists, there will not be an identifier
	})}`);
}
