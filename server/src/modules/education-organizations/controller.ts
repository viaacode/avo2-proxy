import { get, sortBy, uniqBy } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { InternalServerError } from '../../shared/helpers/error';

import EducationOrganizationsService, {
	LdapEducationOrganization,
	LdapEducationOrganizationWithUnits,
	LdapEduOrgUnit,
} from './service';

export default class EducationOrganizationsController {
	/**
	 * Get ldap organizations with their units and produce a list of org names with their unit address
	 * @param city
	 * @param zipCode
	 */
	public static async getOrganizations(
		city: string | undefined,
		zipCode: string | undefined
	): Promise<Avo.EducationOrganization.Organization[]> {
		try {
			let orgs: LdapEducationOrganization[] = await EducationOrganizationsService.getOrganizations(
				city,
				null
			);

			if (orgs && orgs.length === 0) {
				// If you can't find any organizations by city name, try using the zipCode
				orgs = await EducationOrganizationsService.getOrganizations(null, zipCode);
			}

			let units: LdapEduOrgUnit[] = await EducationOrganizationsService.getUnits(city, null);

			if (orgs && orgs.length === 0) {
				// If you can't find any organizations by city name, try using the zipCode
				units = await EducationOrganizationsService.getUnits(null, zipCode);
			}

			// Map ldap orgs to client ldap orgs so less data has to be sent to the client
			const simplifiedOrgs: Avo.EducationOrganization.Organization[] = orgs.map((org) => {
				return {
					organizationId: org.or_id,
					unitId: null,
					label: `${org.name}`,
				};
			});
			const simplifiedUnits: Avo.EducationOrganization.Organization[] = units.map(
				(unit: LdapEduOrgUnit): Avo.EducationOrganization.Organization => ({
					organizationId: unit.or_id,
					unitId: unit.ou_id,
					label: `${unit.name} - ${unit.address}`,
				})
			);

			const uniqueOrgs = uniqBy([...simplifiedOrgs, ...simplifiedUnits], 'label');
			return sortBy(uniqueOrgs, ['label']);
		} catch (err) {
			throw new InternalServerError('Failed to get organizations from the ldap api', err, {
				zipCode,
			});
		}
	}

	public static async getOrganizationName(
		organisationId: string,
		unitId: string
	): Promise<string | null> {
		const ldapOrg: LdapEducationOrganizationWithUnits = await EducationOrganizationsService.getOrganization(
			organisationId,
			unitId
		);
		if (!ldapOrg) {
			return null;
		}
		const unitAddress = get(
			(ldapOrg.units || []).find((unit) => unit.id === unitId),
			'address',
			null
		);
		return ldapOrg.name + (unitAddress ? ` - ${unitAddress}` : '');
	}
}
