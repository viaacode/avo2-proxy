import * as queryString from 'querystring';
import { Return } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

export function redirectToClientErrorPage(
	message: string,
	icon: string = 'alert-triangle',
	actionButtons: Avo.Auth.ErrorActionButton[] = [],
	identifier?: string
) {
	return new Return.MovedTemporarily<void>(
		`${process.env.CLIENT_HOST}/error?${queryString.stringify({
			message,
			icon,
			actionButtons: actionButtons.join(','),
			...(identifier ? { identifier } : {}), // If no hard error object exists, there will not be an identifier
			logout: true,
		})}`
	);
}
