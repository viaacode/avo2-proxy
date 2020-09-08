import { get, set, trimEnd } from 'lodash';
import { Context, GET, Path, QueryParam, Return, ServiceContext } from 'typescript-rest';

import { CustomError, InternalServerError } from '../../../../shared/helpers/error';
import { redirectToClientErrorPage } from '../../../../shared/helpers/error-redirect-client';
import { logger } from '../../../../shared/helpers/logger';
import { isRelativeUrl } from '../../../../shared/helpers/relative-url';
import i18n from '../../../../shared/translations/i18n';
import { IdpHelper } from '../../idp-helper';
import { LINK_ACCOUNT_PATH, LinkAccountInfo } from '../../route';

import SmartschoolController, {
	LoginErrorResponse,
	LoginSuccessResponse,
	SmartschoolUserLoginResponse,
} from './controller';
import SmartschoolService from './service';

const REDIRECT_URL_PATH = 'request.session.returnToUrl';
const GET_SMARTSCHOOL_ERROR_MESSAGES = () => ({
	// tslint:disable-next-line:max-line-length
	FIRST_LINK_ACCOUNT: i18n.t('modules/auth/idps/smartschool/route___link-eerst-je-accounts'),
	NO_ACCESS: i18n.t(
		'modules/auth/idps/smartschool/route___enkel-leerkrachten-en-leerlingen-kunnen-inloggen-via-smartschool-op-deze-website'
	),
});

@Path('/auth/smartschool')
export default class SmartschoolRoute {
	@Context
	context: ServiceContext;

	@Path('login')
	@GET
	async login(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		try {
			set(
				this.context,
				REDIRECT_URL_PATH,
				returnToUrl || `${trimEnd(process.env.CLIENT_HOST, '/')}/start`
			);
			const url = SmartschoolService.getRedirectUrlForCode();
			return new Return.MovedTemporarily<void>(url);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during smartschool auth login route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/smartschool/route___er-ging-iets-mis-tijdens-het-inloggen-met-smartschool'
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
			const userOrError: SmartschoolUserLoginResponse = await SmartschoolController.getUserFromSmartschoolLogin(
				code
			);

			if (get(userOrError, 'avoUser.is_blocked')) {
				return redirectToClientErrorPage(
					i18n.t('modules/auth/idps/hetarchief/route___geen-avo-groep-error'),
					'lock',
					['home', 'helpdesk']
				);
			}

			const response: LoginSuccessResponse = userOrError as LoginSuccessResponse;

			let redirectUrl = get(this.context, REDIRECT_URL_PATH);
			if (redirectUrl && redirectUrl.includes(process.env.HOST)) {
				// User had to login, to link smartschool account to an existing hetarchief or viaa account
				const linkAccountInfo: LinkAccountInfo = {
					userObject: response.smartschoolUserInfo,
					type: 'SMARTSCHOOL',
				};
				set(this.context, LINK_ACCOUNT_PATH, linkAccountInfo);
			} else {
				// User is logging in to enter avo using their smartschool account
				if ((userOrError as LoginErrorResponse).error) {
					const errorMessage = GET_SMARTSCHOOL_ERROR_MESSAGES()[
						(userOrError as LoginErrorResponse).error
					];
					return redirectToClientErrorPage(errorMessage, 'alert-triangle', [
						'home',
						'helpdesk',
					]);
				}
				// Check if accounts are linked
				if (!response.avoUser) {
					return redirectToClientErrorPage(
						i18n.t(
							'modules/auth/idps/smartschool/route___gelieve-eerst-in-te-loggen-met-je-avo-account-en-je-smartschool-te-koppelen-in-je-account-instellingen'
						),
						'link',
						['home', 'helpdesk']
					);
				}
				IdpHelper.setIdpUserInfoOnSession(
					this.context.request,
					response.smartschoolUserInfo,
					'SMARTSCHOOL'
				);
				IdpHelper.setAvoUserInfoOnSession(this.context.request, response.avoUser);
			}

			if (redirectUrl && isRelativeUrl(redirectUrl)) {
				// We received a relative url => this won't work, we'll fallback to the CLIENT_HOST url
				logger.error(
					new CustomError(
						'Received relative redirect url for smartschool login-callback route',
						null,
						{ redirectUrl }
					)
				);
				redirectUrl = process.env.CLIENT_HOST;
			}

			return new Return.MovedTemporarily(redirectUrl || `${process.env.CLIENT_HOST}/start`);
		} catch (err) {
			const error = new InternalServerError(
				'Failed during smartschool auth login-callback route',
				err,
				{}
			);
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/smartschool/route___er-ging-iets-mis-na-het-inloggen-met-smartschool'
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
			const error = new InternalServerError('Failed during smartschool/logout route', err, {
				returnToUrl,
			});
			logger.error(error);
			return redirectToClientErrorPage(
				i18n.t(
					'modules/auth/idps/smartschool/route___er-ging-iets-mis-tijdens-het-uitloggen-met-smartschool'
				),
				'alert-triangle',
				['home', 'helpdesk'],
				error.identifier
			);
		}
	}
}
