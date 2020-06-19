import { Context, GET, Path, POST, PreProcessor, QueryParam, ServiceContext } from 'typescript-rest';

import { BadRequestError, ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import { templateIds } from './const';
import CampaignMonitorController from './controller';
import { EmailInfo } from './types';

@Path('/campaign-monitor')
export default class CampaignMonitorRoute {
	@Context
	context: ServiceContext;

	/**
	 * Send an email using the campaign monitor api.
	 */
	@Path('send')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	async send(
		info: EmailInfo
	): Promise<void | BadRequestError> {
		// Check inputs
		if (!info || !info.template || !info.to) {
			throw new BadRequestError('body with templateId and to properties is required');
		}
		if (!templateIds[info.template]) {
			throw new BadRequestError(`template must be one of: [${Object.keys(templateIds).join(', ')}]`);
		}

		const avoUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
		if (!avoUser) {
			throw new BadRequestError('To send emails you need to have an active session with the server', null, { avoUser });
		}
		const username = `${avoUser.first_name} ${avoUser.last_name}`;

		// Execute controller
		try {
			await CampaignMonitorController.send({
				...info, data: {
					...info.data,
					username,
				},
			});
		} catch (err) {
			const error = new InternalServerError('Failed during send in campaignMonitor route', err, { info });
			logger.error(error);
			throw new ClientError('Something failed during the request to campaign monitor', null, { info });
		}
	}

	/**
	 * Retrieve newsletter preferences by user's email.
	 */
	@Path('preferences')
	@GET
	@PreProcessor(isAuthenticatedRouteGuard)
	async fetchNewsletterPreferences(
		@QueryParam('email') email: string
	) {
		try {
			return await CampaignMonitorController.fetchNewsletterPreferences(email);
		} catch (err) {
			const error = new InternalServerError('Failed during fetch in campaign monitor preferences route', err, { email });
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Update newsletter preferences by user's email.
	 */
	@Path('preferences')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	async updateNewsletterPreferences(
		body: any
	) {
		try {
			return await CampaignMonitorController.updateNewsletterPreferences(IdpHelper.getAvoUserInfoFromSession(this.context.request), body.preferences);
		} catch (err) {
			const error = new InternalServerError('Failed during update in campaign monitor preferences route', err, { email: body.email });
			logger.error(error);
			throw error;
		}
	}
}
