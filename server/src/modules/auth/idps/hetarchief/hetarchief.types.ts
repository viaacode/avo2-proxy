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
	unit: Partial<Unit>;
	organization: Partial<Organization>;
	confirmed: boolean;
	edu_typename: string[];
	edu_typecode: string[];
	edu_levelname: string[];
	exception_account: ['TRUE' | 'FALSE'];
	business_category: string[];
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

export interface Unit {
	id: string;
	or_id: string;
	ou_id: string;
	name: string;
	dn: string;
	objectclass: string[];
	address: string;
	city: string;
	postal_code: string;
}

export interface Organization {
	id: string;
	or_id: string;
	name: string;
	dn: string;
	objectclass: string[];
	address: string;
	city: string;
	postal_code: string;
	type: string;
	sector: string;
}
