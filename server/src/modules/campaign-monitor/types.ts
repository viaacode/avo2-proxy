import { templateIds } from './const';

export interface CustomFields {
	gebruikersgroep: string;
	oormerk: string;
	stamboeknummer: string;
	is_uitzondering: string;
	firstname: string;
	lastname: string;
	onderwijsniveaus: string;
	vakken: string;
	school_postcodes: string;
	school_ids: string;
	school_campus_ids: string;
	school_namen: string;
}

export interface EmailInfo {
	// TODO use typings version
	template: keyof typeof templateIds;
	to: string;
	data: {
		username?: string; // The server will fill this in, client doesn't need to provide this (security)
		mainLink: string;
		mainTitle: string;
	};
}

export interface HasContent {
	hasPrivateCollections: boolean;
	hasPublicCollections: boolean;
	hasAssignments: boolean;
}
