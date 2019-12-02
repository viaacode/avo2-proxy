import { Path, GET, QueryParam } from 'typescript-rest';
import { CITIES } from './cities';
import EducationOrganizationsController from './controller';
import { InternalServerError } from '../../shared/helpers/error';

export interface ClientEducationOrganization {
	organizationId: string;
	unitId: string;
	label: string; // org.name + ' - ' + unit.address
}

@Path('/education-organizations')
export default class EducationOrganizationsRoute {
	/**
	 * Get list of cities
	 */
	@Path('/cities')
	@GET
	async getCities(): Promise<string[]> {
		return CITIES;
	}

	@Path('/organizations')
	@GET
	async getOrganizationsByCity(@QueryParam('city') city: string, @QueryParam('zipCode') zipCode: string): Promise<ClientEducationOrganization[]> {
		if (!zipCode && !city) {
			throw new InternalServerError('Failed to get organizations because neither the city nor the zipCode queryParams were provided');
		}
		return await EducationOrganizationsController.getOrganizations(city, zipCode);
	}
}
