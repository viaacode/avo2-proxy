export interface OrganisationResponse {
	status: string;
	description: string;
	data: OrganisationInfo[];
}

export interface OrganisationContactInfo {
	phone?: string;
	website?: string;
	email?: string;
	logoUrl?: string;
	form_url?: string;
}

export interface OrganisationInfo {
	or_id: string;
	cp_name: string;
	category?: string;
	sector?: string;
	cp_name_catpro?: string;
	description?: string;
	contact_information: OrganisationContactInfo;
	accountmanager?: string;
}

export interface ParsedOrganisation {
	or_id: string;
	name: string;
	logo_url: string | null;
	description: string | null;
	website: string | null;
	data: OrganisationInfo;
}
