import { Context, Path, ServiceContext, GET, QueryParam, PreProcessor, Return } from 'typescript-rest';

import AuthController from './controller';
import { logger } from '../../shared/helpers/logger';
import { InternalServerError } from '../../shared/helpers/error';
import { IdpType } from './types';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import * as queryString from 'querystring';
import { getHost } from '../../shared/helpers/url';
import _ from 'lodash';
import { Avo } from '@viaa/avo2-types';

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
			logger.error(error.toString());
			throw error;
		}
	}

	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		return AuthController.getIdpSpecificLogoutPage(this.context.request, returnToUrl);
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
}
