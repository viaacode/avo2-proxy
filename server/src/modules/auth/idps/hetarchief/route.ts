import { get, trimEnd } from 'lodash';
import * as queryString from 'querystring';
import {
	Context,
	GET,
	Path,
	POST,
	PreProcessor,
	QueryParam,
	Return,
	ServiceContext,
} from 'typescript-rest';

import { decrypt, encrypt } from '../../../../shared/helpers/encrypt';
import {
	BadRequestError,
	CustomError,
	InternalServerError,
} from '../../../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../../../shared/helpers/error-redirect-client';
import { logger } from '../../../../shared/helpers/logger';
import { isRelativeUrl } from '../../../../shared/helpers/relative-url';
import { jsonStringify } from '../../../../shared/helpers/single-line-logging';
import { checkApiKeyRouteGuard, isLoggedIn } from '../../../../shared/middleware/is-authenticated';
import i18n from '../../../../shared/translations/i18n';
import StamboekController from '../../../stamboek-validate/controller';
import { IdpHelper } from '../../idp-helper';
import { LdapUser } from '../../types';

import HetArchiefController from './controller';
import { LdapPerson, UpdateUserBody } from './hetarchief.types';
import HetArchiefService, { SamlCallbackBody } from './service';

interface RelayState {
	returnToUrl: string;
}

if (!process.env.SUMM_REGISTRATION_PAGE && !process.env.SSUM_REGISTRATION_PAGE) {
	throw new InternalServerError(
		'The environment variable SSUM_REGISTRATION_PAGE should have a value.'
	);
}

@Path('/auth/hetarchief')
export default class HetArchiefRoute {
	@Context
	context: ServiceContext;

	/**
	 * Check if user has active session
	 * - If he does: redirect to "returnTo" query param url
	 * - Otherwise redirect to SAML login page
	 */
	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			const returnTo = returnToUrl || `${trimEnd(process.env.CLIENT_HOST, '/')}/start`;
			if (isLoggedIn(this.context.request)) {
				return new Return.MovedTemporarily<void>(returnTo);
			}
			const url = await HetArchiefService.createLoginRequestUrl(returnTo);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during hetarchief auth login route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/hetarchief/route___er-ging-iets-mis-tijdens-het-inloggen'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Called by SAML service to return LDAP info if user successfully logged in
	 * This function has to redirect the browser back to the app once the information is stored in the user's session
	 */
	@Path('login-callback')
	@POST
	async loginCallback(response: SamlCallbackBody): Promise<any> {
		try {
			const ldapUser: LdapUser = await HetArchiefService.assertSamlResponse(response);
			logger.info(`login-callback ldap info: ${jsonStringify(ldapUser)}`);
			const info: RelayState = response.RelayState ? JSON.parse(response.RelayState) : {};

			IdpHelper.setIdpUserInfoOnSession(this.context.request, ldapUser, 'HETARCHIEF');

			// Check if user account has access to the avo platform
			if (!get(ldapUser, 'attributes.apps', []).includes('avo')) {
				return redirectToClientErrorPage(
					i18n.t('modules/auth/idps/hetarchief/route___geen-avo-groep-error'),
					'lock',
					['home', 'helpdesk']
				);
			}

			const isPartOfRegistrationProcess = (info.returnToUrl || '').includes(process.env.HOST);

			if (isPartOfRegistrationProcess) {
				return new Return.MovedTemporarily(info.returnToUrl);
			}

			try {
				let avoUser = await HetArchiefController.getAvoUserInfoFromDatabaseByLdapUuid(
					ldapUser.attributes.entryUUID[0]
				);

				// Update avo user with ldap fields and user groups
				avoUser = await HetArchiefController.createOrUpdateUser(
					HetArchiefController.ldapObjectToLdapPerson(ldapUser),
					avoUser,
					this.context.request
				);

				if (get(avoUser, 'is_blocked')) {
					return redirectToClientErrorPage(
						i18n.t('modules/auth/idps/hetarchief/route___geen-avo-groep-error'),
						'lock',
						['home', 'helpdesk']
					);
				}

				IdpHelper.setAvoUserInfoOnSession(this.context.request, avoUser);
			} catch (err) {
				const errorString = JSON.stringify(err);
				if (errorString.includes('ENOTFOUND')) {
					// Failed to connect to the database
					return redirectToClientErrorPage(
						i18n.t(
							'modules/auth/idps/hetarchief/route___de-server-kan-je-gebruikers-informatie-niet-ophalen-uit-de-database'
						),
						'alert-triangle',
						['home', 'helpdesk']
					);
				}

				if (errorString.includes('Failed to get role id by role name from the database')) {
					// User does not have a usergroup in LDAP
					return redirectToClientErrorPage(
						i18n.t(
							'modules/auth/idps/hetarchief/route___je-account-heeft-nog-geen-gebruikersgroep-gelieve-de-helpdesk-te-contacteren'
						),
						'alert-triangle',
						['home', 'helpdesk']
					);
				}

				// We want to use this route also for registration, so it could be that the avo user and profile do not exist yet
				logger.info(
					'login callback without avo user object found (this is correct for the registration flow)',
					err,
					{ ldapUser }
				);
			}

			if (info.returnToUrl && isRelativeUrl(info.returnToUrl)) {
				// We received a relative url => this won't work, we'll fallback to the CLIENT_HOST url
				logger.error(
					new CustomError(
						'Received relative redirect url for hetarchief login-callback route',
						null,
						{ returnToUrl: info.returnToUrl }
					)
				);
				return new Return.MovedTemporarily(process.env.CLIENT_HOST);
			}

			return new Return.MovedTemporarily(
				info.returnToUrl || `${process.env.CLIENT_HOST}/start`
			);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during hetarchief auth login-callback route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/idps/hetarchief/route___er-ging-iets-mis-na-het-inloggen'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Redirect the user to the logout page on the SAML identity server
	 * The SAML service will then redirect the browser back to the callback url
	 */
	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			const ldapUser: LdapUser | null = IdpHelper.getIdpUserInfoFromSession(
				this.context.request
			);

			if (ldapUser) {
				// Logout by redirecting to the identity server logout page
				const url = await HetArchiefService.createLogoutRequestUrl(
					ldapUser.name_id,
					`${process.env.HOST}/auth/hetarchief/logout-callback?${queryString.stringify({
						returnToUrl,
					})}`
				);

				// Remove the ldap user from the session
				IdpHelper.logout(this.context.request);

				return new Return.MovedTemporarily<void>(url);
			}
			logger.error(
				new InternalServerError("ldap user wasn't found on the session", null, {
					returnToUrl,
				})
			);
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during hetarchief auth logout route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/idps/hetarchief/route___er-ging-iets-mis-tijdens-het-uitloggen'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Called by the identity provider service after the proxy requested the user to be logged out in response to a call from the client (global logout)
	 * This call should redirect to the return url in the avo client
	 */
	@Path('logout-callback')
	@GET
	async logoutCallbackGet(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			logger.info(`Received call to GET logout-callback, returnToUrl: ${returnToUrl}`);
			return new Return.MovedTemporarily(returnToUrl);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during hetarchief auth GET logout-callback route',
				err,
				{
					returnToUrl,
				}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/idps/hetarchief/route___er-ging-iets-mis-na-het-uitloggen'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Called by the identity provider service when a user logs out of another platform and the idp wants all platforms to logout
	 * This call should redirect to the idp logout response url
	 */
	@Path('logout-callback')
	@POST
	async logoutCallbackPost(response: SamlCallbackBody): Promise<any> {
		try {
			logger.info(`Received call to POST logout-callback, response: ${JSON.stringify(response)}`);

			// Remove the ldap user from the session
			IdpHelper.logout(this.context.request);

			const responseUrl = await HetArchiefService.createLogoutResponseUrl(
				response.RelayState
			);
			return new Return.MovedTemporarily(responseUrl);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during hetarchief auth POST logout-callback route',
				err,
				{
					relayState: response.RelayState,
				}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/idps/hetarchief/route___er-ging-iets-mis-na-het-uitloggen'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Forward the client to the ssum registration page
	 * This way we can avoid needing to set the ssum url in the client for every environment
	 */
	@Path('register')
	@GET
	async register(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('stamboekNumber') stamboekNumber: string | undefined
	): Promise<any> {
		try {
			const serverRedirectUrl = `${
				process.env.HOST
			}/auth/hetarchief/verify-email-callback?${queryString.stringify({
				returnToUrl,
				stamboekNumber: encrypt(stamboekNumber),
			})}`;
			return new Return.MovedTemporarily<void>(
				`${process.env.SSUM_REGISTRATION_PAGE}?${queryString.stringify({
					redirect_to: serverRedirectUrl,
					app_name: process.env.SAML_SP_ENTITY_ID,
					stamboek: stamboekNumber,
				})}`
			);
		} catch (err) {
			const error = new InternalServerError('Failed during auth registration route', err, {});
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/hetarchief/route___er-ging-iets-mis-tijdens-het-registreren-gelieve-de-helpdesk-te-contacteren'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * This will be the return url that the ssum verification email links to
	 * Here we'll forward the user to the login form, so we can identify the user
	 */
	@Path('verify-email-callback')
	@GET
	async verifyEmailCallback(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('stamboekNumber') encryptedStamboekNumber: string
	): Promise<any> {
		try {
			// TODO get saml login data straight from registration form callback => so we can skip this login form step
			const serverRedirectUrl = `${
				process.env.HOST
			}/auth/hetarchief/register-callback?${queryString.stringify({
				returnToUrl,
				stamboekNumber: (encryptedStamboekNumber || '').split('?')[0], // TODO remove once ssum correctly adds "?announce_account_confirmation=true" query param
			})}`;
			const url = `${process.env.HOST}/auth/hetarchief/login?${queryString.stringify({
				returnToUrl: serverRedirectUrl,
			})}`;
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during auth verify email callback route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/hetarchief/route___er-ging-iets-mis-tijdens-het-verifieren-van-je-email-adres'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * This will verify that the user logged in if the user has access, and create an avo user and profile record in the database
	 */
	@Path('register-callback')
	@GET
	async registerCallback(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('stamboekNumber') encryptedStamboekNumber: string
	): Promise<any> {
		try {
			const stamboekNumber = decrypt(encryptedStamboekNumber);
			if (!stamboekNumber) {
				const error = new CustomError(
					'Failed to register user since the register callback function was called without a stamboek number',
					null,
					{
						returnToUrl,
						encryptedStamboekNumber,
					}
				);
				logger.error(error);
				redirectToClientErrorPage(
					i18n.t(
						'modules/auth/idps/hetarchief/route___uw-stamboek-nummer-zit-niet-bij-de-request-we-kunnen-uw-account-niet-registreren'
					),
					'slash',
					['home', 'helpdesk'],
					error.identifier
				);
			}
			const stamboekValidateStatus = await StamboekController.validate(stamboekNumber);
			if (stamboekValidateStatus === 'VALID') {
				const ldapPerson: Partial<LdapPerson> = HetArchiefController.ldapObjectToLdapPerson(
					IdpHelper.getIdpUserInfoFromSession(this.context.request) as LdapUser
				);
				let avoUser = await HetArchiefController.createUserAndProfile(
					ldapPerson,
					stamboekNumber
				);

				// Add permission groups
				const ldapUser = IdpHelper.getIdpUserInfoFromSession(this.context.request);
				avoUser = await HetArchiefController.updateUserGroups(
					HetArchiefController.parseLdapObject(ldapUser),
					avoUser
				);

				// Link avoUser to LdapUser using idp_map table
				await IdpHelper.createIdpMap(
					'HETARCHIEF',
					ldapUser.attributes.entryUUID[0],
					String(avoUser.uid)
				);

				IdpHelper.setAvoUserInfoOnSession(this.context.request, avoUser);

				// redirect back to client, where user will be logged in immediately
				return new Return.MovedTemporarily<void>(returnToUrl);
			}
			if (stamboekValidateStatus === 'ALREADY_IN_USE') {
				redirectToClientErrorPage(
					i18n.t(
						'modules/auth/idps/hetarchief/route___dit-stamboek-nummer-is-reeds-in-gebruik-gelieve-de-helpdesk-te-contacteren'
					),
					'users',
					['home', 'helpdesk']
				);
			}
			// INVALID
			redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/hetarchief/route___dit-stamboek-nummer-is-ongeldig-controleer-u-invoer-en-probeer-opnieuw-te-registeren'
				),
				'x-circle',
				['home', 'helpdesk']
			);
		} catch (err) {
			const error = new InternalServerError('Failed during auth registration route', err, {});
			logger.error(error);
			if (
				JSON.stringify(err).includes(
					'Failed to create user because an avo user with this email address already exists'
				)
			) {
				return redirectToClientErrorPage(
					i18n.t(
						'modules/auth/idps/hetarchief/route___er-bestaat-reeds-een-avo-gebruiker-met-dit-email-adres-gelieve-de-helpdesk-te-contacteren'
					),
					'users',
					['home', 'helpdesk'],
					error.identifier
				);
			}
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/hetarchief/route___er-ging-iets-mis-tijdens-het-registratie-proces-gelieve-de-helpdesk-te-contacteren'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * This route is called from the account manager or ssum when a user is updated in the ldap database
	 * This route will then use the information from the body to update the user information in the avo database
	 */
	@Path('update-user')
	@POST
	@PreProcessor(checkApiKeyRouteGuard)
	async updateUser(body: UpdateUserBody): Promise<any> {
		if (!get(body, 'data.person')) {
			throw new BadRequestError(
				'Body should contain data.person with the ldap info of the person you want to update',
				null,
				{ body }
			);
		}
		try {
			await HetArchiefController.createOrUpdateUser(
				body.data.person,
				null,
				this.context.request
			);

			return { message: 'user has been updated' };
		} catch (err) {
			const error = new InternalServerError(
				'Failed during update user route (hetarchief)',
				err,
				{
					body,
				}
			);
			logger.error(error);
			throw error;
		}
	}
}
