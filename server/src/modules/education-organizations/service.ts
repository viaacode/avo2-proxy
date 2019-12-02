import axios, { AxiosResponse } from 'axios';
import { InternalServerError } from '../../shared/helpers/error';
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

if (!process.env.LDAP_API_ENDPOINT) {
	/* istanbul ignore next */
	logger.error('LDAP_API_ENDPOINT env variable is not set');
}

if (!process.env.LDAP_API_USERNAME) {
	/* istanbul ignore next */
	logger.error('LDAP_API_USERNAME env variable is not set');
}

if (!process.env.LDAP_API_PASSWORD) {
	/* istanbul ignore next */
	logger.error('LDAP_API_PASSWORD env variable is not set');
}

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
}
