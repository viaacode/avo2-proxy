import { get, unset } from 'lodash';
import * as queryString from 'querystring';
import {
	Context,
	DELETE,
	GET,
	Path,
	PreProcessor,
	QueryParam,
	Return,
	ServiceContext,
} from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { CustomError, InternalServerError } from '../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../shared/helpers/error-redirect-client';
import { logger } from '../../shared/helpers/logger';
import {
	checkApiKeyRouteGuard,
	isAuthenticatedRouteGuard,
} from '../../shared/middleware/is-authenticated';
import { clearRedis } from '../../shared/middleware/session';
import i18n from '../../shared/translations/i18n';

import AuthController from './controller';
import { IdpHelper } from './idp-helper';

export const LINK_ACCOUNT_PATH = 'request.session.linkAccountPath';

export interface LinkAccountInfo {
	type: Avo.Auth.IdpType;
	userObject: any;
}

@Path('/auth')
export default class AuthRoute {
	@Context
	context: ServiceContext;

	@Path('check-login')
	@GET
	async checkLogin(): Promise<Avo.Auth.LoginResponse> {
		try {
			return await AuthController.getLoginResponse(this.context.request);
		} catch (err) {
			const error = new InternalServerError('Failed during check-login route', err, {});
			logger.error(error);
			throw new InternalServerError('Failed during check-login route');
		}
	}

	@Path('global-logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		return AuthController.getIdpSpecificLogoutPage(
			this.context.request,
			`${process.env.HOST}/auth/global-logout-callback?${queryString.stringify({
				returnToUrl,
			})}`
		);
	}

	@Path('global-logout-callback')
	@GET
	async logoutCallback(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			IdpHelper.clearAllIdpUserInfosFromSession(this.context.request);
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during auth global-logout-callback route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/route___er-ging-iets-mis-tijdens-het-uitloggen'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	@Path('link-account')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async linkAccount(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('idpType') idpType: Avo.Auth.IdpType
	): Promise<any> {
		return AuthController.redirectToIdpLoginForLinkingAccounts(
			this.context.request,
			returnToUrl,
			idpType
		);
	}

	@Path('link-account-callback')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async linkAccountCallback(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		// The link-account path already made the user login to the idp
		// This flow has set the idp user object on the session, so we can access it here
		const idpUserInfo: LinkAccountInfo = get(this.context, LINK_ACCOUNT_PATH);
		if (!idpUserInfo || !idpUserInfo.type || !idpUserInfo.userObject) {
			const error = new CustomError(
				'Failed to link account in link-account-callback route',
				null,
				{ idpUserInfo, session: get(this.context, 'request.session') }
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/route___het-koppelen-van-de-account-is-mislukt'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
		const redirectResponse = await AuthController.linkAccounts(
			this.context.request,
			idpUserInfo,
			returnToUrl
		);

		// Remove idp user object, since we're done with it
		unset(this.context, LINK_ACCOUNT_PATH);

		return redirectResponse;
	}

	@Path('unlink-account')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async unlinkAccount(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('idpType') idpType: Avo.Auth.IdpType
	): Promise<any> {
		try {
			await AuthController.unlinkAccounts(this.context.request, idpType);
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			const error = new CustomError('Failed to unlink idp from account', err, {
				returnToUrl,
				idpType,
			});
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t('modules/auth/route___het-ontkoppelen-van-de-account-is-mislukt'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	@Path('clear-sessions')
	@DELETE
	@PreProcessor(checkApiKeyRouteGuard)
	async clearSessions(): Promise<any> {
		try {
			await clearRedis();
			return { message: 'User sessions have been cleared' };
		} catch (err) {
			logger.error(new CustomError('Failed to clear redis sessions', err));
		}
	}
}
