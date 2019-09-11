import saml2, { IdentityProvider, ServiceProvider } from 'saml2-js';
import { CustomError } from '@shared/helpers/error';
import axios, { AxiosResponse } from 'axios';
import { logger } from '@shared/helpers/logger';
import convert = require('xml-js');
import _ from 'lodash';

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

if (!process.env.SAML_IPD_META_DATA_ENDPOINT) {
	throw new CustomError('The environment variable SAML_IPD_META_DATA_ENDPOINT should have a value.');
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
	private static serviceProvider: ServiceProvider;
	private static identityProvider: IdentityProvider;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	public static async initialize() {
		const url = process.env.SAML_IPD_META_DATA_ENDPOINT;
		try {
			const response: AxiosResponse<string> = await axios({
				url,
				method: 'post',
			});
			const metaData: IdpMetaData = convert.xml2js(response.data, {
				compact: true,
				trim: true,
				ignoreDeclaration: true,
				ignoreInstruction: true,
				ignoreAttributes: false,
				ignoreComment: true,
				ignoreCdata: true,
				ignoreDoctype: true,
			}) as IdpMetaData;
			const idpCertificatePath = 'md:EntityDescriptor.md:IDPSSODescriptor.md:KeyDescriptor[0].ds:KeyInfo.ds:X509Data.ds:X509Certificate._text';
			const ssoLoginUrlPath = 'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleSignOnService._attributes.Location';
			const ssoLogoutUrlPath = 'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleLogoutService._attributes.Location';
			const idpCertificate = _.get(metaData, idpCertificatePath);
			const ssoLoginUrl = _.get(metaData, ssoLoginUrlPath);
			const ssoLogoutUrl = _.get(metaData, ssoLogoutUrlPath);
			if (!idpCertificate) {
				throw new CustomError('Failed to find certificate in idp metadata', null, {
					metaData,
					idpCertificatePath,
				});
			}
			if (!ssoLoginUrl) {
				throw new CustomError('Failed to find ssoLoginUrl in idp metadata', null, {
					metaData,
					ssoLoginUrlPath,
				});
			}
			if (!ssoLogoutUrl) {
				throw new CustomError('Failed to find ssoLogoutUrl in idp metadata', null, {
					metaData,
					ssoLogoutUrlPath,
				});
			}
			this.serviceProvider = new saml2.ServiceProvider({
				entity_id: process.env.SAML_SP_ENTITY_ID as string,
				private_key: process.env.SAML_PRIVATE_KEY as string,
				certificate: process.env.SAML_SP_CERTIFICATE as string,
				assert_endpoint: 'http://localhost:3000/auth/login',
				// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
				auth_context: { comparison: 'exact', class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'] },
				nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
				sign_get_request: false,
				allow_unencrypted_assertion: true,
			});
			this.identityProvider = new saml2.IdentityProvider({
				sso_login_url: ssoLoginUrl,
				sso_logout_url: ssoLogoutUrl,
				certificates: [idpCertificate],
				// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
				sign_get_request: false,
				allow_unencrypted_assertion: true,
			});
		} catch (err) {
			logger.error(new CustomError('Failed to get meta data from idp server', err, { endpoint: url }));
		}
	}

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
