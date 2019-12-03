import { InternalServerError } from '../../shared/helpers/error';
import EducationOrganizationsService, { LdapEducationOrganization, Unit } from './service';
import _ from 'lodash';
import { ClientEducationOrganization } from './route';

export default class EducationOrganizationsController {

	/**
	 * Get ldap organizations with their units and produce a list of org names with their unit address
	 * @param city
	 * @param zipCode
	 */
	public static async getOrganizations(city: string | undefined, zipCode: string | undefined): Promise<ClientEducationOrganization[]> {
		try {
			let orgs: LdapEducationOrganization[] = await EducationOrganizationsService.getOrganizations(city, null);

			if (orgs && orgs.length === 0) {
				// If you can't find any organizations by city name, try using the zipCode
				orgs = await EducationOrganizationsService.getOrganizations(null, zipCode);
			}

			// Map ldap orgs to client ldap orgs so less data has to be sent to the client
			return _.uniqBy(_.flatten(orgs.map((org) => {
				if (org.units && org.units.length) {
					// Organizations with units
					return org.units.map((unit: Unit): ClientEducationOrganization => ({
						organizationId: org.id,
						unitId: unit.id,
						label: `${org.name} - ${unit.address}`,
					}));
				}
				// Organizations without any units
				return {
					organizationId: org.id,
					unitId: null,
					label: `${org.name}`,
				};
			})), 'label');
		} catch (err) {
			throw new InternalServerError('Failed to get organizations from the ldap api', err, { zipCode });
		}
	}
}
