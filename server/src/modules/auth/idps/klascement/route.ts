import * as util from 'util';
import _ from 'lodash';
import getUuid from 'uuid/v1';
import { Context, Path, Return, ServiceContext, QueryParam, GET } from 'typescript-rest';

import { InternalServerError } from '../../../../shared/helpers/error';
import i18n from '../../../../shared/translations/i18n';
import { logger } from '../../../../shared/helpers/logger';
import { IdpHelper } from '../../idp-helper';
import { LINK_ACCOUNT_PATH, LinkAccountInfo } from '../../route';

import KlascementService from './service';
import KlascementController, { LoginSuccessResponse } from './controller';
import { redirectToClientErrorPage } from '../../../../shared/helpers/error-redirect-client';

const REDIRECT_URL_PATH = 'request.session.returnToUrl';
const REQUEST_ID_PATH = 'request.session.requestId';

@Path('/auth/klascement')
export default class KlascementRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			const requestId = getUuid();
			_.set(this.context, REDIRECT_URL_PATH, (returnToUrl || `${process.env.CLIENT_HOST}/home`));
			_.set(this.context, REQUEST_ID_PATH, requestId);
			const url = KlascementService.getRedirectUrlForCode(requestId);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het inloggen met klascement'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	@Path('login-callback')
	@GET
	async loginCallback(@QueryParam('code') code: string): Promise<Return.MovedTemporarily<void>> {
		try {
			const response: LoginSuccessResponse = await KlascementController.getUserFromKlascementLogin(code);

			const redirectUrl = _.get(this.context, REDIRECT_URL_PATH);
			if (redirectUrl.includes(process.env.HOST)) {
				// User had to login, to link klascement account to an existing hetarchief or viaa account
				const linkAccountInfo: LinkAccountInfo = {
					userObject: response.klascementUserInfo,
					type: 'KLASCEMENT',
				};
				_.set(this.context, LINK_ACCOUNT_PATH, linkAccountInfo);
			} else {
				// User is logging in to enter avo using their klascement account
				// Check if accounts are linked
				if (!response.avoUser) {
					return redirectToClientErrorPage(
						i18n.t('Gelieve eerst in te loggen met je avo account en je klascement te koppelen in je account instellingen'),
						'link',
						['home', 'helpdesk'],
					);
				}
				IdpHelper.setIdpUserInfoOnSession(this.context.request, response.klascementUserInfo, 'KLASCEMENT');
				IdpHelper.setAvoUserInfoOnSession(this.context.request, response.avoUser);
			}

			return new Return.MovedTemporarily(redirectUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during auth login route', err, {});
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis na het inloggen met klascement'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}

	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			IdpHelper.logout(this.context.request);
			return new Return.MovedTemporarily(returnToUrl);
		} catch (err) {
			const error = new InternalServerError('Failed during klascement/logout route', err, { returnToUrl });
			logger.error(util.inspect(error));
			return redirectToClientErrorPage(
				i18n.t('Er ging iets mis tijdens het uitloggen met klascement'),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}
}
