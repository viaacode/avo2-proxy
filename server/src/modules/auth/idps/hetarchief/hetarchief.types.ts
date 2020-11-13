export interface UpdateUserBody {
	data: Data;
}

export interface Data {
	person: LdapPerson;
	platform: string;
}

export interface LdapPerson {
	id: string;
	email: string[];
	first_name: string;
	last_name: string;
	confirmed_at_ts: string;
	dn: string;
	cn: string;
	ou: string[];
	organizational_status: string[];
	employee_nr: string[];
	display_name: string[];
	objectclass: string[];
	apps: App[];
	groups: Group[];
	educationalOrganisationUnitIds: string[];
	educationalOrganisationIds: string[];
	confirmed: boolean;
	edu_typename: string[];
	edu_typecode: string[];
	edu_levelname: string[];
	exception_account: ['TRUE' | 'FALSE'];
	role: string[]; // company
	sector: string[]; // business category or also oormerk
}

export interface App {
	id: string;
	name: string;
	description: string;
	dn: string;
	objectclass: string[];
}

export interface Group {
	id: string;
	name: string[];
	description: string[];
	dn: string;
	objectclass: string[];
}

export interface LdapApiUserInfo {
	email: string;
	first_name: string;
	last_name: string;
	confirmed: boolean;
	organizations: string[];
	units: string[];
	password: string;
	apps: string[];
	groups: string[];
	edu_levelname: string[];
	external_id: string;
}
