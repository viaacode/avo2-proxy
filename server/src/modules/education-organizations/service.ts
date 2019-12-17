import axios, { AxiosResponse } from 'axios';
import { ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import * as querystring from 'query-string';
import { Avo } from '@viaa/avo2-types';
import EducationOrganization = Avo.EducationOrganization;

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
	units: Unit[];
}

export interface Unit {
	id: string;
	ou_id: string;
	name: string;
	dn: string;
	objectclass: string[];
	address: string;
	city: string;
	postal_code: string;
}

checkRequiredEnvs([
	'LDAP_API_ENDPOINT',
	'LDAP_API_USERNAME',
	'LDAP_API_PASSWORD',
]);

export default class EducationOrganizationsService {
	/**
	 * Get organizations by zipCode
	 * @param cityName
	 * @param zipCode
	 */
	public static async getOrganizations(cityName: string | null, zipCode: string | null): Promise<LdapEducationOrganization[]> {
		let url: string;
		try {
			if (!cityName && !zipCode) {
				return [];
			}
			url = `${process.env.LDAP_API_ENDPOINT}/organizations?size=200&sideload=units`;
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
				'Failed to get organizations from the ldap api',
				err,
				{
					url,
					zipCode,
				});
			logger.error(error);
			throw error;
		}
	}

	public static async getOrganization(organizationId: string, unitId: string): Promise<LdapEducationOrganization | null> {
		let url: string;
		try {
			url = `${process.env.LDAP_API_ENDPOINT}/organizations?${querystring.stringify({
				sideload: 'units',
				organization_id: organizationId,
			})}`;
			const response: AxiosResponse<LdapEducationOrganization> = await axios(url, {
				method: 'get',
				auth: {
					username: process.env.LDAP_API_USERNAME,
					password: process.env.LDAP_API_PASSWORD,
				},
			});
			return response.data || null;
		} catch (err) {
			const error = new ExternalServerError(
				'Failed to get an organization from the ldap api',
				err,
				{
					url,
					organizationId,
					unitId,
				});
			logger.error(error);
			throw error;
		}
	}
}
