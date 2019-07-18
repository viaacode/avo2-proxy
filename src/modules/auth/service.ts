import saml2 from 'saml2-js';
import { RecursiveError } from '../../helpers/recursiveError';

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

export default class AuthService {
	private static serviceProviderOptions = {
		entity_id: 'http://avo2-tst/sp',
		private_key: process.env.SAML_PRIVATE_KEY || '',
		certificate: process.env.SAML_SP_CERTIFICATE || '',
		assert_endpoint: 'https://sp.example.com/assert',
		// force_authn: true,
		auth_context: { comparison: 'exact', class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'] },
		nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
		sign_get_request: false,
		allow_unencrypted_assertion: true,
	};

	private static identityProviderOptions = {
		sso_login_url: 'https://idp-tst.hetarchief.be/saml2/idp/SSOService.php',
		sso_logout_url: 'https://idp-tst.hetarchief.be/saml2/idp/SingleLogoutService.php',
		certificates: [process.env.SAML_IDP_CERTIFICATE || ''],
		force_authn: true,
		sign_get_request: false,
		allow_unencrypted_assertion: false,
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
						reject(new RecursiveError('Failed to create login request url on SAML service provider', error));
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
						reject(new RecursiveError('Failed to verify SAML response', err, { requestBody }));
					} else {
						resolve(samlResponse.user);
					}
				});
		});
	}

	public static createLogoutRequestUrl(returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_logout_request_url(
				AuthService.identityProvider,
				{
					relay_state: JSON.stringify({ returnToUrl }),
				},
				(error: any, logoutUrl: string) => {
					if (error) {
						reject(new RecursiveError('Failed to create logout request url on saml service provider', error));
					} else {
						resolve(logoutUrl);
					}
				});
		});
	}
}
