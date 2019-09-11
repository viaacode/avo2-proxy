import saml2, { IdentityProviderOptions, ServiceProviderOptions } from 'saml2-js';
import { CustomError } from '@shared/helpers/error';

export interface SamlCallbackBody {
	SAMLResponse: string;
	RelayState: string; // JSON
}

interface DecodedSamlResponse {
	response_header: ResponseHeader;
	type: string;
	user: LdapUser;
}

interface ResponseHeader {
	version: string;
	destination: string;
	in_response_to: string;
	id: string;
}

export interface LdapUser {
	name_id: string; // email address user
	session_index: string;
	session_not_on_or_after: string; // date string eg: "2019-07-18T12:08:20Z"
	attributes: LdapAttributes;
}

interface LdapAttributes {
	mail: string[];
	givenName: string[]; // firstname
	sn: string[]; // lastname
	cn: string[]; // fullname
	o: string[]; // organization id
	entryUUID: string[];
	entryDN: string[]; // eg: mail=bert.verhelst@studiohyperdrive.be,ou=people,dc=hetarchief,dc=be
	oNickname: string[]; // name organization
}

if (!process.env.SAML_SP_ENTITY_ID) {
	throw new CustomError('The environment variable SAML_SP_ENTITY_ID should have a value.');
}
if (!process.env.SAML_IDP_SSO_LOGIN_URL) {
	throw new CustomError('The environment variable SAML_IDP_SSO_LOGIN_URL should have a value.');
}
if (!process.env.SAML_IDP_SSO_LOGOUT_URL) {
	throw new CustomError('The environment variable SAML_IDP_SSO_LOGOUT_URL should have a value.');
}

export default class AuthService {
	private static serviceProviderOptions: ServiceProviderOptions = {
		entity_id: process.env.SAML_SP_ENTITY_ID as string,
		private_key: process.env.SAML_PRIVATE_KEY as string,
		certificate: process.env.SAML_SP_CERTIFICATE as string,
		assert_endpoint: 'http://localhost:3000/auth/login',
		// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
		auth_context: { comparison: 'exact', class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'] },
		nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
		sign_get_request: false,
		allow_unencrypted_assertion: true,
	};

	private static identityProviderOptions: IdentityProviderOptions = {
		sso_login_url: process.env.SAML_IDP_SSO_LOGIN_URL as string,
		sso_logout_url: process.env.SAML_IDP_SSO_LOGOUT_URL as string,
		certificates: [process.env.SAML_IDP_CERTIFICATE || ''],
		// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
		sign_get_request: false,
		allow_unencrypted_assertion: true,
	};

	private static serviceProvider = new saml2.ServiceProvider(AuthService.serviceProviderOptions);
	private static identityProvider = new saml2.IdentityProvider(AuthService.identityProviderOptions);

	public static createLoginRequestUrl(returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_login_request_url(
				AuthService.identityProvider,
				{
					relay_state: JSON.stringify({ returnToUrl }),
				},
				(error: any, loginUrl: string, requestId: string) => {
					if (error) {
						reject(new CustomError('Failed to create login request url on SAML service provider', error));
					} else {
						resolve(loginUrl);
					}
				});
		});
	}

	public static assertSamlResponse(requestBody: SamlCallbackBody): Promise<LdapUser> {
		return new Promise((resolve, reject) => {
			this.serviceProvider.post_assert(
				this.identityProvider,
				{
					request_body: requestBody,
					allow_unencrypted_assertion: true,
				},
				(err, samlResponse: DecodedSamlResponse) => {
					if (err) {
						reject(new CustomError('Failed to verify SAML response', err, { requestBody }));
					} else {
						resolve(samlResponse.user);
					}
				});
		});
	}

	public static createLogoutRequestUrl(nameId: string, returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_logout_request_url(
				AuthService.identityProvider,
				{
					relay_state: JSON.stringify({ returnToUrl }),
					name_id: nameId,
				},
				(error: any, logoutUrl: string) => {
					if (error) {
						reject(new CustomError('Failed to create logout request url on saml service provider', error));
					} else {
						resolve(logoutUrl);
					}
				});
		});
	}
}
