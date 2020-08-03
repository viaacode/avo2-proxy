import { get, set, trimEnd } from 'lodash';
import { Context, GET, Path, QueryParam, Return, ServiceContext } from 'typescript-rest';
import getUuid from 'uuid/v1';

import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../../../shared/helpers/error-redirect-client';
import { logger } from '../../../../shared/helpers/logger';
import { isRelativeUrl } from '../../../../shared/helpers/relative-url';
import i18n from '../../../../shared/translations/i18n';
import { IdpHelper } from '../../idp-helper';
import { LINK_ACCOUNT_PATH, LinkAccountInfo } from '../../route';

import KlascementController, { LoginSuccessResponse } from './controller';
import KlascementService from './service';

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
			set(
				this.context,
				REDIRECT_URL_PATH,
				returnToUrl || `${trimEnd(process.env.CLIENT_HOST, '/')}/start`
			);
			set(this.context, REQUEST_ID_PATH, requestId);
			const url = KlascementService.getRedirectUrlForCode(requestId);
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during klascement auth login route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/klascement/route___er-ging-iets-mis-tijdens-het-inloggen-met-klascement'
				),
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
			const response: LoginSuccessResponse = await KlascementController.getUserFromKlascementLogin(
				code
			);

			if (get(response.avoUser, 'is_blocked')) {
				return redirectToClientErrorPage(
					i18n.t('modules/auth/idps/hetarchief/route___geen-avo-groep-error'),
					'lock',
					['home', 'helpdesk']
				);
			}

			let redirectUrl = get(this.context, REDIRECT_URL_PATH);
			if (redirectUrl.includes(process.env.HOST)) {
				// User had to login, to link klascement account to an existing hetarchief or viaa account
				const linkAccountInfo: LinkAccountInfo = {
					userObject: response.klascementUserInfo,
					type: 'KLASCEMENT',
				};
				set(this.context, LINK_ACCOUNT_PATH, linkAccountInfo);
			} else {
				// User is logging in to enter avo using their klascement account
				// Check if accounts are linked
				if (!response.avoUser) {
					return redirectToClientErrorPage(
						i18n.t(
							'modules/auth/idps/klascement/route___gelieve-eerst-in-te-loggen-met-je-avo-account-en-je-klascement-te-koppelen-in-je-account-instellingen'
						),
						'link',
						['home', 'helpdesk']
					);
				}
				IdpHelper.setIdpUserInfoOnSession(
					this.context.request,
					response.klascementUserInfo,
					'KLASCEMENT'
				);
				IdpHelper.setAvoUserInfoOnSession(this.context.request, response.avoUser);
			}

			if (redirectUrl && isRelativeUrl(redirectUrl)) {
				// We received a relative url => this won't work, we'll fallback to the CLIENT_HOST url
				logger.error(
					new CustomError(
						'Received relative redirect url for klascement login-callback route',
						null,
						{ redirectUrl }
					)
				);
				redirectUrl = process.env.CLIENT_HOST;
			}

			return new Return.MovedTemporarily(redirectUrl || `${process.env.CLIENT_HOST}/start`);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during klascement auth login-callback route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/klascement/route___er-ging-iets-mis-na-het-inloggen-met-klascement'
				),
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
			const error = new InternalServerError('Failed during klascement/logout route', err, {
				returnToUrl,
			});
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/klascement/route___er-ging-iets-mis-tijdens-het-uitloggen-met-klascement'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}
}
