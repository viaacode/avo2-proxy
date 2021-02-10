import { templateIds } from './campaign-monitor.const';

export interface CustomFields {
	is_geblokkeerd: 'true' | 'false';
	aangemaakt_op: string;
	laatst_ingelogd_op: string;
	heeft_publieke_collecties: 'true' | 'false';
	heeft_prive_collecties: 'true' | 'false';
	heeft_opdrachten: 'true' | 'false';
	heeft_hetarchief_link: 'true' | 'false';
	heeft_smartschool_link: 'true' | 'false';
	heeft_klascement_link: 'true' | 'false';
	is_profiel_compleet: 'true' | 'false';
	gebruikersgroep: string;
	oormerk: string;
	stamboeknummer: string;
	is_uitzondering: 'true' | 'false';
	firstname: string;
	lastname: string;
	onderwijsniveaus: string;
	vakken: string;
	school_postcodes: string;
	school_ids: string;
	school_campus_ids: string;
	school_namen: string;
}

export interface SharedContentData {
	username?: string; // The server will fill this in, client doesn't need to provide this (security)
	mainLink: string;
	mainTitle: string;
}

export interface EmailUserInfo {
	email: string;
	UserGroup: string;
}

export interface DeleteUserInfo {
	email: string;
}

export interface EmailInfo {
	template: keyof typeof templateIds;
	to: string | string[];
	data?: SharedContentData | EmailUserInfo | DeleteUserInfo;
}

export interface HasContent {
	hasPrivateCollections: boolean;
	hasPublicCollections: boolean;
	hasAssignments: boolean;
}

export interface CmUserInfo {
	email: string;
	name: string;
	customFields: CustomFields;
}
