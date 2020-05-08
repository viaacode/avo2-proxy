import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

export type ErrorActionButton = 'home' | 'helpdesk'; // TODO use type in typings repo

export function redirectToClientErrorPage(
	message: string,
	icon: string = 'alert-triangle',
	actionButtons: ErrorActionButton[] = [],
	identifier?: string
) {
	return new Return.MovedTemporarily<void>(`${process.env.CLIENT_HOST}/error?${queryString.stringify({
		message,
		icon,
		actionButtons: actionButtons.join(','),
		...(identifier ? { identifier } : {}), // If no hard error object exists, there will not be an identifier
		logout: true,
	})}`);
}
