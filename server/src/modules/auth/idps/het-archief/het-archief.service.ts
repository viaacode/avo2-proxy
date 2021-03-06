import axios, { AxiosResponse } from 'axios';
import { get } from 'lodash';
import saml2, { IdentityProvider, ServiceProvider } from 'saml2-js';
import convert = require('xml-js');

import { checkRequiredEnvs } from '../../../../shared/helpers/env-check';
import { ExternalServerError, InternalServerError } from '../../../../shared/helpers/error';
import { logger, logIfNotTestEnv } from '../../../../shared/helpers/logger';
import DataService from '../../../data/data.service';
import { IdpMetaData, LdapUser } from '../../types';

import { GET_PROFILE_IDS_BY_LDAP_IDS } from './het-archief.gql';
import { LdapApiUserInfo } from './het-archief.types';

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
			const idpCertificatePath = 'md:EntityDescriptor.md:IDPSSODescriptor.md:KeyDescriptor';
			const ssoLoginUrlPath =
				'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleSignOnService._attributes.Location';
			const ssoLogoutUrlPath =
				'md:EntityDescriptor.md:IDPSSODescriptor.md:SingleLogoutService._attributes.Location';

			// Get all signing certificates from the idp saml xml metadata
			const rawIdpCertificates = get(metaData, idpCertificatePath);
			const signingIdpCertificates = rawIdpCertificates
				.filter((cert: any) => get(cert, '_attributes.use') === 'signing')
				.map((cert: any) => get(cert, 'ds:KeyInfo.ds:X509Data.ds:X509Certificate._text'));
			this.ssoLoginUrl = get(metaData, ssoLoginUrlPath);
			this.ssoLogoutUrl = get(metaData, ssoLogoutUrlPath);
			if (!signingIdpCertificates.length) {
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
				certificates: signingIdpCertificates,
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
				(error: any, loginUrl: string) => {
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
				} as any,
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

	static createLogoutResponseUrl(relayState: any) {
		return new Promise<string>((resolve, reject) => {
			this.serviceProvider.create_logout_response_url(
				HetArchiefService.identityProvider,
				{ relay_state: relayState },
				(error: any, responseUrl: string) => {
					if (error) {
						reject(
							new InternalServerError(
								'Failed to create logout response url on saml service provider',
								error
							)
						);
					} else {
						resolve(responseUrl);
					}
				}
			);
		});
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
				throw new ExternalServerError('Response status code was unexpected.', null, {
					response,
				});
			}
		} catch (err) {
			throw new InternalServerError('Failed to set user info from the ldap api', err, {
				url,
				ldapUserId,
			});
		}
	}

	static async getProfileIdsByLdapIds(
		userLdapUuids: string[]
	): Promise<{ profileId: string; mail: string }[]> {
		try {
			const response = await DataService.execute(GET_PROFILE_IDS_BY_LDAP_IDS, {
				userLdapUuids,
			});

			if (response.errors) {
				throw new InternalServerError(
					'Failed to fetch profileIds by ldap uuids from the database',
					null,
					{ response }
				);
			}

			return get(response, 'data.users_idp_map', []).map((userInfo: any) => ({
				profileId: get(userInfo, 'local_user.profile.id'),
				mail: get(userInfo, 'local_user.mail'),
			}));
		} catch (err) {
			throw new InternalServerError(
				'Failed to get profileIds by ldap uuids from the database',
				err,
				{
					userLdapUuids,
				}
			);
		}
	}

	static async addAvoAppToLdapUsers(emails: string[]): Promise<void> {
		const url = `${process.env.LDAP_API_ENDPOINT}/attribute`;

		try {
			const response: AxiosResponse<any> = await axios(url, {
				method: 'post',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
				data: {
					mod: {
						'x-be-viaa-apps': ['avo'],
					},
					entries: emails.map((email: string) => ({
						dn: `mail=${email},ou=people,dc=hetarchief,dc=be`,
					})),
				},
			});

			if (response.status < 200 || response.status >= 400) {
				throw new ExternalServerError('Response status code was unexpected.', null, {
					response,
				});
			}
		} catch (err) {
			throw new InternalServerError('Failed to add AvO app to LDAP user.', err, {
				emails,
			});
		}
	}

	static async removeAvoAppFromLdapUsers(emails: string[]): Promise<void> {
		const url = `${process.env.LDAP_API_ENDPOINT}/attribute`;

		if (!emails || !emails.length) {
			return;
		}

		try {
			const response: AxiosResponse<any> = await axios(url, {
				method: 'delete',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
				data: {
					mod: {
						'x-be-viaa-apps': ['avo'],
					},
					entries: emails.map((email: string) => ({
						dn: `mail=${email},ou=people,dc=hetarchief,dc=be`,
					})),
				},
			});

			if (response.status < 200 || response.status >= 400) {
				throw new ExternalServerError('Response status code was unexpected.', null, {
					response,
				});
			}
		} catch (err) {
			throw new InternalServerError('Failed to remove AvO app from LDAP user.', err, {
				emails,
			});
		}
	}
}
