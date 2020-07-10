import { Request } from 'express';

import { Avo } from '@viaa/avo2-types';

export interface IdpMap {
	id: number;
	local_user_id: string; // uuid
	idp: IdpType; // enum
	idp_user_id: string;
}

/**
 {
  "name_id": "bert.verhelst@studiohyperdrive.be",
  "session_index": "_88c4bf190c88565a131ad70ba664c32bc944a35d81",
  "session_not_on_or_after": "2019-09-30T16:18:25Z",
  "attributes": {
    "mail": [
      "bert.verhelst@studiohyperdrive.be"
    ],
    "givenName": [
      "Bert"
    ],
    "sn": [
      "Verhelst"
    ],
    "cn": [
      "Bert Verhelst"
    ],
    "o": [
      "12345"
    ],
    "entryUUID": [
      "9cd5fc48-3cbe-1039-9d6c-93fac417d71d"
    ],
    "entryDN": [
      "mail=bert.verhelst@studiohyperdrive.be,ou=people,dc=hetarchief,dc=be"
    ],
    "apps": [
      "avo"
    ],
    "oNickname": [
      "Test organisatie"
    ]
  }
}
 */
export interface LdapUser {
	name_id: string; // email address user
	session_index: string;
	session_not_on_or_after: string; // date string eg: "2019-07-18T12:08:20Z"
	attributes: LdapAttributes;
}

interface LdapAttributes {
	mail: string[];
	displayName: string[]; // username or nickname
	givenName: string[]; // firstname
	sn: string[]; // lastname
	cn: string[]; // fullname
	o: string[]; // organization id
	entryUUID: string[];
	entryDN: string[]; // eg: mail=bert.verhelst@studiohyperdrive.be,ou=people,dc=hetarchief,dc=be
	apps: string[]; // avo
	oNickname: string[]; // name organization
	employeeNumber: string[]; // stamboek number
	'x-be-viaa-eduTypeName': string[];
	'x-be-viaa-eduLevelName': string[];
	organizationalStatus: string[]; // usergroup
	'x-be-viaa-eduExceptionAccount': string[]; // is_exception account
	role: string[];
	sector: string[];
}

export interface SharedUser {
	first_name: string;
	last_name: string;
	profiles: Profile[];
	created_at: string;
	expires_at: any;
	external_uid: number;
	role: any;
	uid: string;
	updated_at: string;
	mail: string;
	idpmaps: { idp: IdpType }[];
	profile_classifications: {
		key: string;
	}[];
	profile_contexts: {
		key: string;
	}[];
	profile_organizations: {
		unit_id: string | null;
		organization_id: string;
	}[];
}

export interface Profile {
	id: number;
	alias: any;
	alternative_email: string;
	avatar: any;
	created_at: string;
	stamboek: any;
	updated_at: string;
	user_id: string;
	company_id: string | null;
	organisation: Avo.Organization.Organization | null;
	groups: {
		group: {
			group_user_permission_groups: {
				permission_group: {
					permission_group_user_permissions: {
						permission: {
							label: string;
						};
					}[];
				};
			}[];
		};
	}[];
}

export type IdpType = 'HETARCHIEF' | 'SMARTSCHOOL' | 'KLASCEMENT'; // TODO switch to typings library

export interface IdpMetaData {
	'md:EntityDescriptor': {
		_attributes: {
			'xmlns:md': string;
			'xmlns:ds': string;
			entityID: string;
		};
		'md:IDPSSODescriptor': {
			_attributes: {
				protocolSupportEnumeration: string;
				WantAuthnRequestsSigned: string;
			};
			'md:KeyDescriptor': {
				_attributes: {
					use: string;
				};
				'ds:KeyInfo': {
					_attributes: {
						'xmlns:ds': string;
					};
					'ds:X509Data': {
						'ds:X509Certificate': {
							_text: string;
						};
					};
				};
			}[];
			'md:SingleLogoutService': {
				_attributes: {
					Binding: string;
					Location: string;
				};
			};
			'md:NameIDFormat': {
				_text: string;
			};
			'md:SingleSignOnService': {
				_attributes: {
					Binding: string;
					Location: string;
				};
			};
		};
		'md:ContactPerson': {
			_attributes: {
				contactType: string;
			};
			'md:GivenName': {
				_text: string;
			};
			'md:SurName': {
				_text: string;
			};
			'md:EmailAddress': {
				_text: string;
			};
		};
	};
}

export interface UserGroup {
	label: string;
	id: number;
	ldap_role: string | null;
}

export interface IdpInterface {
	isLoggedIn: (req: Request) => boolean;
	logoutPath: string;
	loginPath?: string;
	getUserId?: (userInfo: any) => string | number;
}

export enum SpecialPermissionGroups {
	loggedOutUsers = -1,
	loggedInUsers = -2,
}
