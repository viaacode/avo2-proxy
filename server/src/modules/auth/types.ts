interface IdpMetaData {
	'md:EntityDescriptor': MdEntityDescriptor;
}

interface MdEntityDescriptor {
	_attributes: Attributes;
	'md:IDPSSODescriptor': MdIdpssodescriptor;
	'md:ContactPerson': MdContactPerson;
}

interface Attributes {
	'xmlns:md': string;
	'xmlns:ds': string;
	entityID: string;
}

interface MdIdpssodescriptor {
	_attributes: Attributes2;
	'md:KeyDescriptor': MdKeyDescriptor[];
	'md:SingleLogoutService': MdSingleLogoutService;
	'md:NameIDFormat': MdNameIdformat;
	'md:SingleSignOnService': MdSingleSignOnService;
}

interface Attributes2 {
	protocolSupportEnumeration: string;
	WantAuthnRequestsSigned: string;
}

interface MdKeyDescriptor {
	_attributes: Attributes3;
	'ds:KeyInfo': DsKeyInfo;
}

interface Attributes3 {
	use: string;
}

interface DsKeyInfo {
	_attributes: Attributes4;
	'ds:X509Data': DsX509Data;
}

interface Attributes4 {
	'xmlns:ds': string;
}

interface DsX509Data {
	'ds:X509Certificate': DsX509Certificate;
}

interface DsX509Certificate {
	_text: string;
}

interface MdSingleLogoutService {
	_attributes: Attributes5;
}

interface Attributes5 {
	Binding: string;
	Location: string;
}

interface MdNameIdformat {
	_text: string;
}

interface MdSingleSignOnService {
	_attributes: Attributes6;
}

interface Attributes6 {
	Binding: string;
	Location: string;
}

interface MdContactPerson {
	_attributes: Attributes7;
	'md:GivenName': MdGivenName;
	'md:SurName': MdSurName;
	'md:EmailAddress': MdEmailAddress;
}

interface Attributes7 {
	contactType: string;
}

interface MdGivenName {
	_text: string;
}

interface MdSurName {
	_text: string;
}

interface MdEmailAddress {
	_text: string;
}
