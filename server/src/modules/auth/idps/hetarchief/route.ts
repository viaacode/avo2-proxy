import * as util from 'util';
import _ from 'lodash';
import * as queryString from 'querystring';
import { Context, Path, POST, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';

import i18n from '../../../../shared/translations/i18n';
import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { logger } from '../../../../shared/helpers/logger';
import { IdpHelper } from '../../idp-helper';
import AuthController from '../../controller';
import { LdapUser } from '../../types';
import StamboekController from '../../../stamboek-validate/controller';
import { decrypt, encrypt } from '../../../../shared/helpers/encrypt';
import { redirectToClientErrorPage } from '../../../../shared/helpers/error-redirect-client';

import HetArchiefService, { SamlCallbackBody } from './service';
import HetArchiefController from './controller';

interface RelayState {
	returnToUrl: string;
}

const STAMBOEK_NUMBER_PATH = 'request.session.stamboekNumber';

if (!process.env.SUMM_REGISTRATION_PAGE && !process.env.SSUM_REGISTRATION_PAGE) {
	throw new InternalServerError('The environment variable SSUM_REGISTRATION_PAGE should have a value.');
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
			if (AuthController.isAuthenticated(this.context.request)) {
				return new Return.MovedTemporarily<void>(returnToUrl);
			}
			const url = await HetArchiefService.createLoginRequestUrl(returnToUrl);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het inloggen'),
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
			logger.info('login-callback ldap info: ', JSON.stringify(ldapUser, null, 2));
			const info: RelayState = JSON.parse(response.RelayState);

			const isPartOfRegistrationProcess = (info.returnToUrl || '').includes(process.env.HOST);

			IdpHelper.setIdpUserInfoOnSession(this.context.request, ldapUser, 'HETARCHIEF');
			try {
				IdpHelper.setAvoUserInfoOnSession(this.context.request, await HetArchiefController.getAvoUserInfoFromDatabaseByEmail(ldapUser));
			} catch (err) {
				// We want to use this route also for registration, so it could be that the avo user and profile do not exist yet
				logger.info('login callback without avo user object found (this is correct for the registration flow)', err, { ldapUser });
			}

			// Check if user account has access to the avo platform
			if (!isPartOfRegistrationProcess && !_.get(ldapUser, 'attributes.apps', []).includes('avo')) {
				return redirectToClientErrorPage(
					i18n.t('Je account heeft geen toegang tot AvO. Indien je denk dat dit een fout is, contacteer de helpdesk via de feedback knop rechts onderaan.'),
					'lock',
					['home', 'helpdesk'],
				);
			}

			return new Return.MovedTemporarily(info.returnToUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis na het inloggen'),
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
			const ldapUser: LdapUser | null = IdpHelper.getIdpUserInfoFromSession(this.context.request);

			// Remove the ldap user from the session
			IdpHelper.logout(this.context.request);

			if (ldapUser) {
				// Logout by redirecting to the identity server logout page
				const url = await HetArchiefService.createLogoutRequestUrl(ldapUser.name_id, returnToUrl);
				return new Return.MovedTemporarily<void>(url);
			}
			logger.error(new InternalServerError(
				'ldap user wasn\'t found on the session',
				null,
				{ returnToUrl },
			));
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het uitloggen'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	/**
	 * Called by SAML service to let the proxy know what the logout status is of the user after a logout attempt
	 * This function has to redirect the browser back to the app
	 */
	@Path('logout-callback')
	@POST
	async logoutCallback(response: SamlCallbackBody): Promise<any> {
		try {
			const info: RelayState = JSON.parse(response.RelayState);
			return new Return.MovedTemporarily(info.returnToUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, { relayState: response.RelayState });
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis na het uitloggen'),
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
		@QueryParam('stamboekNumber') stamboekNumber: string | undefined,
	): Promise<any> {
		try {
			_.set(this.context, STAMBOEK_NUMBER_PATH, stamboekNumber);
			const serverRedirectUrl = `${process.env.HOST}/auth/hetarchief/verify-email-callback?${queryString.stringify({
				returnToUrl,
				stamboekNumber: encrypt(stamboekNumber),
			})}`;
			return new Return.MovedTemporarily<void>(`${process.env.SSUM_REGISTRATION_PAGE || process.env.SUMM_REGISTRATION_PAGE}?${queryString.stringify({
				redirect_to: serverRedirectUrl,
				app_name: process.env.SAML_SP_ENTITY_ID,
				stamboek: stamboekNumber,
			})}`);
		} catch (err) {
			const error = new InternalServerError('Failed during auth registration route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het registreren, gelieve de helpdesk te contacteren'),
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
	async verifyEmailCallback(@QueryParam('returnToUrl') returnToUrl: string, @QueryParam('stamboekNumber') encryptedStamboekNumber: string): Promise<any> {
		try {
			// TODO get saml login data straight from registration form callback => so we can skip this login form step
			const serverRedirectUrl = `${process.env.HOST}/auth/hetarchief/register-callback?${queryString.stringify({
				returnToUrl,
				stamboekNumber: (encryptedStamboekNumber || '').split('?')[0], // TODO remove once ssum correctly adds "?announce_account_confirmation=true" query param
			})}`;
			const url = `${process.env.HOST}/auth/hetarchief/login?${queryString.stringify({
				returnToUrl: serverRedirectUrl,
			})}`;
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError('Failed during auth verify email callback route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het verifiëren van je email adres'),
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
	async registerCallback(@QueryParam('returnToUrl') returnToUrl: string, @QueryParam('stamboekNumber') encryptedStamboekNumber: string): Promise<any> {
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
					i18n.t('Uw stamboek nummer zit niet bij de request, we kunnen uw account niet registreren'),
					'slash',
					['home', 'helpdesk'],
					error.identifier,
				);
			}
			const stamboekValidateStatus = await StamboekController.validate(stamboekNumber);
			if (stamboekValidateStatus === 'VALID') {
				await HetArchiefController.createUserAndProfile(this.context.request, stamboekNumber);
				return new Return.MovedTemporarily<void>(returnToUrl);
			}
			if (stamboekValidateStatus === 'ALREADY_IN_USE') {
				redirectToClientErrorPage(
					i18n.t('Dit stamboek nummer is reeds in gebruik, gelieve de helpdesk te contacteren.'),
					'users',
					['home', 'helpdesk'],
				);
			}
			// INVALID
			redirectToClientErrorPage(
				i18n.t('Dit stamboek nummer is ongeldig. Controleer u invoer en probeer opnieuw te registeren.'),
				'x-circle',
				['home', 'helpdesk'],
			);
		} catch (err) {
			const error = new InternalServerError('Failed during auth registration route', err, {});
			logger.error(util.inspect(error));
			if (JSON.stringify(err).includes('Failed to create user because an avo user with this email address already exists')) {
				return redirectToClientErrorPage(
					i18n.t('Er bestaat reeds een avo gebruiker met dit email adres. Gelieve de helpdesk te contacteren.'),
					'users',
					['home', 'helpdesk'],
					error.identifier,
				);
			}
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het registratie proces, gelieve de helpdesk te contacteren'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier,
			);
		}
	}
}
