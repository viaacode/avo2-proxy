// TODO: Implement in typings
import { templateIds } from './const';

export interface NewsletterPreferences {
	newsletter: boolean;
	workshop: boolean;
	ambassador: boolean;
	allActiveUsers: boolean;
}

export interface CustomFields {
	Role: string;
	Lerarenkaart: string;
	Graad: string;
	School: string;
	Vestigingsnummer: string;
}

export type NewsletterKey = keyof NewsletterPreferences;

export interface EmailInfo { // TODO use typings version
	template: keyof typeof templateIds;
	to: string;
	data: {
		username?: string; // The server will fill this in, client doesn't need to provide this (security)
		mainLink: string;
		mainTitle: string;
	};
}
