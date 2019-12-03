import axios, { AxiosResponse } from 'axios';
import { find } from 'lodash';
import cron from 'node-cron';

import { logger, logIfNotTestEnv } from '../../shared/helpers/logger';
import { InternalServerError } from '../../shared/helpers/error';
import DataService from '../data/service';

import { INSERT_ORGANIZATIONS, DELETE_ORGANIZATIONS } from './queries.gql';

interface OrganizationResponse {
	status: string;
	description: string;
	data: OrganizationInfo[];
}

export interface OrganizationContactInfo {
	phone?: string;
	website?: string;
	email?: string;
	logoUrl?: string;
	form_url?: string;
}

export interface OrganizationInfo {
	or_id: string;
	cp_name: string;
	category?: string;
	sector?: string;
	cp_name_catpro?: string;
	description?: string;
	contact_information: OrganizationContactInfo;
	accountmanager?: string;
}

export interface ParsedOrganization {
	or_id: string;
	name: string;
	logo_url: string | null;
	description: string | null;
	website: string | null;
	data: OrganizationInfo;
}

export default class OrganizationService {
	private static organizations: OrganizationInfo[];

	public static async initialize() {
		try {
			logIfNotTestEnv('caching organizations...');

			await OrganizationService.updateOrganizationsCache();

			// Register a cron job to refresh the organizations every night
			if (process.env.NODE_ENV !== 'test') {
				/* istanbul ignore next */
				cron.schedule('0 0 04 * * *', async () => {
					await OrganizationService.initialize();
				}).start();
			}

			logIfNotTestEnv('caching organizations... done');
		} catch (err) {
			logIfNotTestEnv('caching organizations... error');

			/* istanbul ignore next */
			logger.error(new InternalServerError('Failed to fill initial organizations cache or schedule cron job to renew the cache', err));
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

				await OrganizationService.emptyOrganizations();
				await OrganizationService.insertOrganizations();
			} else {
				/* istanbul ignore next */
				throw new InternalServerError(
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
			throw new InternalServerError(
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
			return find(OrganizationService.organizations, { or_id: orgId }) || null;
		} catch (err) {
			/* istanbul ignore next */
			throw new InternalServerError(
				'Failed to get organization info for id',
				err,
				{
					orgId,
				});
		}
	}

	private static async insertOrganizations(): Promise<void> {
		const parsedOrganizations: ParsedOrganization[] = OrganizationService.organizations.map((organization: OrganizationInfo) => ({
			or_id: organization.or_id,
			name: organization.cp_name,
			website: organization.contact_information.website,
			logo_url: organization.contact_information.logoUrl,
			description: organization.description,
			data: organization,
		}));

		try {
			return await DataService.execute(INSERT_ORGANIZATIONS, {
				organizations: parsedOrganizations,
			});
		} catch (err) {
			throw new InternalServerError(
				'Failed to insert organizations',
				err
			);
		}
	}

	private static async emptyOrganizations(): Promise<void> {
		try {
			return await DataService.execute(DELETE_ORGANIZATIONS);
		} catch (err) {
			throw new InternalServerError(
				'Failed to empty organizations',
				err
			);
		}
	}
}
