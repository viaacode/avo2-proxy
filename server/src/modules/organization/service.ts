import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import cron from 'node-cron';
import { logger } from '../../shared/helpers/logger';
import { CustomError } from '../../shared/helpers/error';

interface OrganizationResponse {
	status: string;
	description: string;
	data: OrganizationInfo[];
}

export interface OrganizationInfo {
	or_id: string;
	cp_name: string;
	category: string | null;
	sector: string | null;
	cp_name_catpro: string | null;
	contact_information: {
		phone: string | null;
		website: string | null;
		email: string | null;
		logoUrl: string | null;
	};
}

export default class OrganizationService {
	private static organizations: OrganizationInfo[];

	public static async initialize() {
		try {
			await OrganizationService.updateOrganizationsCache();
			// Register a cron job to refresh the organizations every night
			if (process.env.NODE_ENV !== 'test') {
				/* istanbul ignore next */
				cron.schedule('0 0 04 * * *', async () => {
					await OrganizationService.initialize();
				}).start();
			}
		} catch (err) {
			/* istanbul ignore next */
			logger.error(new CustomError('Failed to fill initial organizations cache or schedule cron job to renew the cache', err));
		}
	}

	private static async updateOrganizationsCache() {
		let url;
		try {
			url = process.env.ORGANIZATIONS_API_URL;
			const orgResponse: AxiosResponse<OrganizationResponse> = await axios({
				url,
				method: 'get',
			});

			// Handle response
			if (orgResponse.status >= 200 && orgResponse.status < 400) {
				// Return search results
				OrganizationService.organizations = orgResponse.data.data;
			} else {
				/* istanbul ignore next */
				throw new CustomError(
					'Request to organizations api was unsuccessful',
					null,
					{
						url,
						method: 'get',
						status: orgResponse.status,
						statusText: orgResponse.statusText,
					});
			}

		} catch (err) {
			/* istanbul ignore next */
			throw new CustomError(
				'Failed to make request to elasticsearch',
				err,
				{
					url,
					method: 'get',
				});
		}
	}

	public static getOrganisationInfo(orgId: string): OrganizationInfo | null {
		try {
			return _.find(OrganizationService.organizations, { or_id: orgId }) || null;
		} catch (err) {
			/* istanbul ignore next */
			throw new CustomError(
				'Failed to get organization info for id',
				err,
				{
					orgId,
				});
		}
	}
}
