import CampaignMonitorService from './service';
import { EmailInfo } from './route';

export default class CampaignMonitorController {

	/**
	 * Send an email using the campaign monitor api
	 * @param info
	 */
	public static async send(info: EmailInfo): Promise<void> {
		return CampaignMonitorService.send(info);
	}
}
