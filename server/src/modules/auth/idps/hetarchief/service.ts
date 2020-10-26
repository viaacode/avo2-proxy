import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import saml2, { IdentityProvider, ServiceProvider } from 'saml2-js';
import convert = require('xml-js');

import { checkRequiredEnvs } from '../../../../shared/helpers/env-check';
import { ExternalServerError, InternalServerError } from '../../../../shared/helpers/error';
import { logger, logIfNotTestEnv } from '../../../../shared/helpers/logger';
import { LdapEducationOrganization } from '../../../education-organizations/service';
import { IdpMetaData, LdapUser } from '../../types';

import { LdapApiUserInfo } from './hetarchief.types';

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

checkRequiredEnvs(['SAML_IDP_META_DATA_ENDPOINT', 'SAML_SP_ENTITY_ID']);

export default class HetArchiefService {
	private static serviceProvider: ServiceProvider;
	private static identityProvider: IdentityProvider;
	private static ssoLoginUrl: string | undefined;
	private static ssoLogoutUrl: string | undefined;

	/**
	 * Get saml credentials and signin and signout links directly from the idp when the server starts
	 */
	static async initialize() {
		logIfNotTestEnv('caching idp info hetarchief...');
		const url = process.env.SAML_IDP_META_DATA_ENDPOINT;
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
			const idpCertificatePath =
				'md:EntityDescriptor.md:IDPSSODescriptor.md:KeyDescriptor[0].ds:KeyInfo.ds:X509Data.ds:X509Certificate._text';
			const ssoLoginUrlPath =
				'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleSignOnService._attributes.Location';
			const ssoLogoutUrlPath =
				'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleLogoutService._attributes.Location';
			const idpCertificate = _.get(metaData, idpCertificatePath);
			this.ssoLoginUrl = _.get(metaData, ssoLoginUrlPath);
			this.ssoLogoutUrl = _.get(metaData, ssoLogoutUrlPath);
			if (!idpCertificate) {
				throw new ExternalServerError('Failed to find certificate in idp metadata', null, {
					metaData,
					idpCertificatePath,
				});
			}
			if (!this.ssoLoginUrl) {
				throw new ExternalServerError('Failed to find ssoLoginUrl in idp metadata', null, {
					metaData,
					ssoLoginUrlPath,
				});
			}
			if (!this.ssoLogoutUrl) {
				throw new ExternalServerError('Failed to find ssoLogoutUrl in idp metadata', null, {
					metaData,
					ssoLogoutUrlPath,
				});
			}
			this.serviceProvider = new saml2.ServiceProvider({
				entity_id: process.env.SAML_SP_ENTITY_ID as string,
				private_key: process.env.SAML_PRIVATE_KEY as string,
				certificate: process.env.SAML_SP_CERTIFICATE as string,
				assert_endpoint: `${process.env.HOST}/auth/hetarchief/login-callback`,
				// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
				auth_context: {
					comparison: 'exact',
					class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'],
				},
				nameid_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
				sign_get_request: false,
				allow_unencrypted_assertion: true,
			});
			this.identityProvider = new saml2.IdentityProvider({
				sso_login_url: this.ssoLoginUrl,
				sso_logout_url: this.ssoLogoutUrl,
				certificates: [idpCertificate],
				// force_authn: true, // TODO enable certificates once the app runs on https on qas/prd
				sign_get_request: false,
				allow_unencrypted_assertion: true,
			});
			logIfNotTestEnv('caching idp info hetarchief... done');
		} catch (err) {
			logIfNotTestEnv('caching idp info hetarchief... error');
			logger.error(
				new InternalServerError('Failed to get meta data from idp server', err, {
					endpoint: url,
				})
			);
		}
	}

	static createLoginRequestUrl(returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_login_request_url(
				HetArchiefService.identityProvider,
				{
					relay_state: JSON.stringify({ returnToUrl }),
				},
				(error: any, loginUrl: string, requestId: string) => {
					if (error) {
						reject(
							new InternalServerError(
								'Failed to create login request url on SAML service provider',
								error
							)
						);
					} else {
						resolve(loginUrl);
					}
				}
			);
		});
	}

	static assertSamlResponse(requestBody: SamlCallbackBody): Promise<LdapUser> {
		return new Promise((resolve, reject) => {
			this.serviceProvider.post_assert(
				this.identityProvider,
				{
					request_body: requestBody,
					allow_unencrypted_assertion: true,
				},
				(err, samlResponse: DecodedSamlResponse) => {
					if (err) {
						reject(
							new InternalServerError('Failed to verify SAML response', err, {
								requestBody,
							})
						);
					} else {
						resolve(samlResponse.user);
					}
				}
			);
		});
	}

	static createLogoutRequestUrl(nameId: string, returnToUrl: string) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_logout_request_url(
				HetArchiefService.identityProvider,
				{
					relay_state: JSON.stringify({ returnToUrl }),
					name_id: nameId,
				},
				(error: any, logoutUrl: string) => {
					if (error) {
						reject(
							new InternalServerError(
								'Failed to create logout request url on saml service provider',
								error
							)
						);
					} else {
						resolve(logoutUrl);
					}
				}
			);
		});
	}

	static getLoginUrl(): string | undefined {
		return this.ssoLoginUrl;
	}

	static getLogoutUrl(): string | undefined {
		return this.ssoLogoutUrl;
	}

	static async setLdapUserInfo(
		ldapUserId: string,
		ldapUserInfo: Partial<LdapApiUserInfo>
	): Promise<void> {
		let url: string;
		try {
			url = `${process.env.LDAP_API_ENDPOINT}/people/${ldapUserId}`;
			const response: AxiosResponse<LdapApiUserInfo> = await axios(url, {
				method: 'put',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
				data: ldapUserInfo,
			});
			if (response.status < 200 || response.status >= 400) {
				throw new ExternalServerError('response status code was unexpected', null, {
					response,
				});
			}
		} catch (err) {
			const error = new InternalServerError(
				'Failed to set user info from the ldap api',
				err,
				{
					url,
					ldapUserId,
				}
			);
			logger.error(error);
			throw error;
		}
	}
}
