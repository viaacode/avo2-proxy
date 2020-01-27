import { Context, Path, ServiceContext, POST } from 'typescript-rest';
import CampaignMonitorController from './controller';
import * as util from 'util';
import { logger } from '../../shared/helpers/logger';
import { InternalServerError, BadRequestError } from '../../shared/helpers/error';

export const templateIds = {
	item: '4293ab4f-40a9-47ae-bb17-32edb593c3ba',
	collection: 'f0a7ca5e-63f6-43e7-9bba-8f266a0edb32',
	bundle: '57e3816c-8fda-4d30-8b59-1483d89798f6',
};

export interface EmailInfo { // TODO use typings version
	template: keyof typeof templateIds;
	to: string;
	data: any;
}

@Path('/campaign-monitor')
export default class CampaignMonitorRoute {
	@Context
	context: ServiceContext;

	/**
	 * Send an email using the campaign monitor api
	 */
	@Path('validate')
	@POST
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

		// Execute controller
		try {
			await CampaignMonitorController.send(info);
		} catch (err) {
			const error = new InternalServerError('Failed during send in campaignMonitor route', err, { info });
			logger.error(util.inspect(error));
			throw util.inspect(error);
		}
	}
}

const assetLink =
	'https://archief-media.viaa.be/viaa/TESTBEELD/30db04e51c934cf497f439168796df807055864f1ded44e1829f7ab8ed374785/keyframes-thumb/keyframes_1_1/keyframe1.jpg';
new CampaignMonitorRoute().send({
	to: 'verhelstbert@gmail.com',
	template: 'collection',
	data: {
		gebruikersnaam: 'Test user',
		titel: 'Hongkong protest',
		'x-apple-data-detectors': 'x-apple-data-detectorsTestValue',
		href: 'http://localhost:8080/collecties/234567',
		'style*="font-size:1px"': 'style*="font-size:1px"',
		'link-asset': assetLink,
	},
})
	.then(() => logger.log('success'))
	.catch((err: any) => logger.error(`fail: ${err.toString()}`));
