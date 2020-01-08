import * as queryString from 'querystring';
import _ from 'lodash';
import * as util from 'util';
import { Context, Path, ServiceContext, GET, QueryParam, PreProcessor, Return } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { logger } from '../../shared/helpers/logger';
import { CustomError, InternalServerError } from '../../shared/helpers/error';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import { getHost } from '../../shared/helpers/url';

import { IdpHelper } from './idp-helper';
import AuthController from './controller';
import { IdpType } from './types';

export const LINK_ACCOUNT_PATH = 'request.session.linkAccountPath';

export interface LinkAccountInfo {
	type: IdpType;
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
			logger.info('check login: error', err);
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			throw error;
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
		IdpHelper.clearAllIdpUserInfosFromSession(this.context.request);
		return new Return.MovedTemporarily<void>(returnToUrl);
	}

	@Path('link-account')
	@GET
	@PreProcessor(isAuthenticated)
	async linkAccount(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('idpType') idpType: IdpType,
	): Promise<any> {
		return AuthController.redirectToIdpLoginForLinkingAccounts(this.context.request, returnToUrl, idpType);
	}

	@Path('link-account-callback')
	@GET
	@PreProcessor(isAuthenticated)
	async linkAccountCallback(
		@QueryParam('returnToUrl') returnToUrl: string,
	): Promise<any> {
		const clientHost = getHost(returnToUrl);

		// The link-account path already made the user login to the idp
		// This flow has set the idp user object on the session, so we can access it here
		const idpUserInfo: LinkAccountInfo = _.get(this.context, LINK_ACCOUNT_PATH);
		if (!idpUserInfo || !idpUserInfo.type || !idpUserInfo.userObject) {
			return new Return.MovedTemporarily<void>(`${clientHost}/error?${queryString.stringify({
				message: 'Het koppelen van de account is mislukt',
				icon: 'alert-triangle',
			})}`);
		}
		const redirectResponse = await AuthController.linkAccounts(this.context.request, idpUserInfo, returnToUrl);

		// Remove idp user object, since we're done with it
		_.unset(this.context, LINK_ACCOUNT_PATH);

		return redirectResponse;
	}

	@Path('unlink-account')
	@GET
	@PreProcessor(isAuthenticated)
	async unlinkAccount(
		@QueryParam('returnToUrl') returnToUrl: string,
		@QueryParam('idpType') idpType: IdpType,
	): Promise<any> {
		const clientHost = getHost(returnToUrl);
		try {
			await AuthController.unlinkAccounts(this.context.request, idpType);
			return new Return.MovedTemporarily<void>(returnToUrl);
		} catch (err) {
			return new Return.MovedTemporarily<void>(`${clientHost}/error?${queryString.stringify({
				message: 'Het ontkoppelen van de account is mislukt',
				icon: 'alert-triangle',
			})}`);
		}
	}
}
