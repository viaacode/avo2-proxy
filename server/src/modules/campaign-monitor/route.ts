import { Context, GET, Path, POST, PreProcessor, QueryParam, ServiceContext } from 'typescript-rest';

import { BadRequestError, ClientError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticated } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';

import CampaignMonitorController from './controller';

export const templateIds = {
	item: '4293ab4f-40a9-47ae-bb17-32edb593c3ba',
	collection: 'f0a7ca5e-63f6-43e7-9bba-8f266a0edb32',
	bundle: '57e3816c-8fda-4d30-8b59-1483d89798f6',
};

export interface EmailInfo { // TODO use typings version
	template: keyof typeof templateIds;
	to: string;
	data: {
		username?: string; // The server will fill this in, client doesn't need to provide this (security)
		mainLink: string;
		mainTitle: string;
	};
}

@Path('/campaign-monitor')
export default class CampaignMonitorRoute {
	@Context
	context: ServiceContext;

	/**
	 * Send an email using the campaign monitor api.
	 */
	@Path('send')
	@POST
	@PreProcessor(isAuthenticated)
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
	@PreProcessor(isAuthenticated)
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
	@PreProcessor(isAuthenticated)
	async updateNewsletterPreferences(
		body: any
	) {
		try {
			return await CampaignMonitorController.updateNewsletterPreferences(body.name, body.email, body.preferences);
		} catch (err) {
			const error = new InternalServerError('Failed during update in campaign monitor preferences route', err, { email: body.email });
			logger.error(error);
			throw error;
		}
	}
}
