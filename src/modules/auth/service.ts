import saml2 from 'saml2-js';
import { RecursiveError } from '../../helpers/recursiveError';

export default class AuthService {
	private static serviceProviderOptions = {
		entity_id: 'http://idp-tst.hetarchief.be/idp',
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

	public static createLoginRequestUrl(callbackUrl: string, returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_login_request_url(
				AuthService.identityProvider,
				{
					relay_state: JSON.stringify({ callbackUrl, returnToUrl }),
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

	public static assertSamlResponse(requestBody: string): Promise<{ nameId: string, sessionIndex: string }> {
		return new Promise((resolve, reject) => {
			this.serviceProvider.post_assert(this.identityProvider, { request_body: requestBody }, (err, samlResponse) => {
				if (err != null) {
					reject(new RecursiveError('Failed to verify SAML response', err, { requestBody }));
				}

				resolve({
					nameId: samlResponse.user.name_id,
					sessionIndex: samlResponse.user.session_index,
				});
			});
		});
	}

	public static createLogoutRequestUrl(callbackUrl: string, returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_logout_request_url(
				AuthService.identityProvider,
				{
					relay_state: JSON.stringify({ callbackUrl, returnToUrl }),
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
