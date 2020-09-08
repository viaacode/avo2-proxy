import axios, { AxiosResponse } from 'axios';
import { get, uniqBy } from 'lodash';
import cron from 'node-cron';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';
import { logger, logIfNotTestEnv } from '../../shared/helpers/logger';
import DataService from '../data/service';

import { DELETE_ORGANIZATIONS, GET_ORGANIZATIONS, INSERT_ORGANIZATIONS } from './queries.gql';

interface OrganisationResponse {
	status: string;
	description: string;
	data: OrganisationInfo[];
}

export interface OrganisationContactInfo {
	phone?: string;
	website?: string;
	email?: string;
	logoUrl?: string;
	form_url?: string;
}

export interface OrganisationInfo {
	or_id: string;
	cp_name: string;
	category?: string;
	sector?: string;
	cp_name_catpro?: string;
	description?: string;
	contact_information: OrganisationContactInfo;
	accountmanager?: string;
}

export interface ParsedOrganisation {
	or_id: string;
	name: string;
	logo_url: string | null;
	description: string | null;
	website: string | null;
	data: OrganisationInfo;
}

export default class OrganisationService {
	public static async initialize() {
		// For now you can manually trigger a refresh of the cache using /organisations/update-cache with the proxy api key
		try {
			logIfNotTestEnv('caching organizations...');

			await OrganisationService.updateOrganisationsCache();

			// Register a cron job to refresh the organizations every night
			if (process.env.NODE_ENV !== 'test') {
				/* istanbul ignore next */
				cron.schedule('0 0 04 * * *', async () => {
					await OrganisationService.initialize();
				}).start();
			}

			logIfNotTestEnv('caching organizations... done');
		} catch (err) {
			logIfNotTestEnv('caching organizations... error');

			/* istanbul ignore next */
			logger.error(
				new InternalServerError(
					'Failed to fill initial organizations cache or schedule cron job to renew the cache',
					err
				)
			);
		}
	}

	public static async updateOrganisationsCache() {
		let url;

		try {
			url = process.env.ORGANIZATIONS_API_URL;

			const orgResponse: AxiosResponse<OrganisationResponse> = await axios({
				url,
				method: 'get',
				headers: {
					authorization: `bearer ${process.env.ORGANIZATIONS_API_TOKEN}`,
				},
			});

			// Handle response
			if (
				orgResponse.status >= 200 &&
				orgResponse.status < 400 &&
				orgResponse.data.data.length > 50
			) {
				await OrganisationService.emptyOrganizations();
				await OrganisationService.insertOrganizations(orgResponse.data.data);
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
					}
				);
			}
		} catch (err) {
			/* istanbul ignore next */
			throw new InternalServerError('Failed to make update organization cache', err, {
				url,
				method: 'get',
			});
		}
	}

	private static async insertOrganizations(organizations: OrganisationInfo[]): Promise<void> {
		const parsedOrganizations: ParsedOrganisation[] = organizations.map(
			(organization: OrganisationInfo) => ({
				or_id: organization.or_id,
				name: organization.cp_name_catpro || organization.cp_name,
				website: organization.contact_information.website,
				logo_url: organization.contact_information.logoUrl,
				description: organization.description,
				data: organization,
			})
		);

		try {
			return await DataService.execute(INSERT_ORGANIZATIONS, {
				organizations: uniqBy(parsedOrganizations, 'or_id'),
			});
		} catch (err) {
			throw new InternalServerError('Failed to insert organizations', err);
		}
	}

	static async fetchOrganization(id: string): Promise<Avo.Organization.Organization | null> {
		try {
			const response = await DataService.execute(GET_ORGANIZATIONS, { id });
			return get(response, 'data.shared_organisations[0]') || null;
		} catch (err) {
			throw new InternalServerError('Failed to fetch organization', err, {
				id,
				query: GET_ORGANIZATIONS,
			});
		}
	}

	private static async emptyOrganizations(): Promise<void> {
		try {
			return await DataService.execute(DELETE_ORGANIZATIONS);
		} catch (err) {
			throw new InternalServerError('Failed to empty organizations', err);
		}
	}
}
