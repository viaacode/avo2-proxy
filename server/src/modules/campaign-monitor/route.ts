import * as util from 'util';
import { Context, Path, ServiceContext, POST, PreProcessor } from 'typescript-rest';

import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError } from '../../shared/helpers/error';
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
		username?: string;
		mainLink: strin;
	};
}

@Path('/campaign-monitor')
export default class CampaignMonitorRoute {
	@Context
	context: ServiceContext;

	/**
	 * Send an email using the campaign monitor api
	 */
	@Path('send')
	@POST
	@PreProcessor(isAuthenticated)
	async send(
		info: EmailInfo
	): Promise<void> {
		// Check inputs
		if (!info || !info.template || !info.to) {
			throw new BadRequestError('body with templateId and to properties is required');
		}
		if (!templateIds[info.template]) {
			throw new BadRequestError(`template must be one of: [${Object.keys(templateIds).join(', ')}]`);
		}

		const avoUser = IdpHelper.getAvoUserInfoFromSession(this.context.request);
		if (!avoUser) {
			throw new InternalServerError('To send emails you need to have an active session with the server', null, { avoUser });
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
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}
