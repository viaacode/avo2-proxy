import axios, { AxiosResponse } from 'axios';
import * as querystring from 'query-string';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

export interface LdapEducationOrganization {
	id: string;
	or_id: string;
	name: string;
	dn: string;
	objectclass: string[];
	address: string;
	city: string;
	postal_code: string;
	type: string;
	sector: string;
}

export interface LdapEducationOrganizationWithUnits extends LdapEducationOrganization {
	units: LdapEduOrgUnit[];
}

export interface LdapEduOrgUnit {
	id: string;
	or_id: string;
	ou_id: string;
	name: string;
	dn: string;
	objectclass: string[];
	address: string;
	city: string;
	postal_code: string;
}

checkRequiredEnvs(['LDAP_API_ENDPOINT', 'LDAP_API_USERNAME', 'LDAP_API_PASSWORD']);

export default class EducationOrganizationsService {
	/**
	 * Get organizations by zipCode
	 * @param cityName
	 * @param zipCode
	 */
	public static async getOrganizations(
		cityName: string | null,
		zipCode: string | null
	): Promise<LdapEducationOrganization[]> {
		let url: string;
		try {
			if (!cityName && !zipCode) {
				return [];
			}
			url = `${process.env.LDAP_API_ENDPOINT}/organizations?size=1000`;
			if (zipCode) {
				url += `&postal_code=${zipCode}`;
			} else {
				url += `&city=${cityName}`;
			}
			const response: AxiosResponse<LdapEducationOrganization[]> = await axios(url, {
				method: 'get',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
			});
			return response.data;
		} catch (err) {
			const error = new InternalServerError(
				'Failed to get educational organizations from the ldap api',
				err,
				{
					url,
					zipCode,
				}
			);
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Get units by zipCode
	 * @param cityName
	 * @param zipCode
	 */
	public static async getUnits(
		cityName: string | null,
		zipCode: string | null
	): Promise<LdapEduOrgUnit[]> {
		let url: string;
		try {
			if (!cityName && !zipCode) {
				return [];
			}
			url = `${process.env.LDAP_API_ENDPOINT}/units?size=1000`;
			if (zipCode) {
				url += `&postal_code=${zipCode}`;
			} else {
				url += `&city=${cityName}`;
			}
			const response: AxiosResponse<LdapEduOrgUnit[]> = await axios(url, {
				method: 'get',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
			});
			return response.data;
		} catch (err) {
			const error = new InternalServerError(
				'Failed to get educational organisation units from the ldap api',
				err,
				{
					url,
					zipCode,
				}
			);
			logger.error(error);
			throw error;
		}
	}

	public static async getOrganization(
		organizationId: string,
		unitId: string
	): Promise<LdapEducationOrganizationWithUnits | null> {
		let url: string;
		try {
			url = `${process.env.LDAP_API_ENDPOINT}/organizations?${querystring.stringify({
				sideload: 'units',
				or_id: organizationId,
			})}`;
			const response: AxiosResponse<LdapEducationOrganizationWithUnits[]> = await axios(url, {
				method: 'get',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
			});
			return (response.data || [])[0];
		} catch (err) {
			const error = new ExternalServerError(
				'Failed to get an organization from the ldap api',
				err,
				{
					url,
					organizationId,
					unitId,
				}
			);
			logger.error(error);
			throw error;
		}
	}
}
