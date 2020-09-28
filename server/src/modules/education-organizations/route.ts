import { GET, Path, QueryParam } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError, CustomError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import { CITIES } from './cities';
import EducationOrganizationsController from './controller';

@Path('/education-organisations')
export default class EducationOrganizationsRoute {
	/**
	 * Get list of cities
	 */
	@Path('/cities')
	@GET
	async getCities(): Promise<string[]> {
		return CITIES;
	}

	@Path('/organisations')
	@GET
	async getOrganizationsByCity(
		@QueryParam('city') city: string,
		@QueryParam('zipCode') zipCode: string
	): Promise<Avo.EducationOrganization.Organization[]> {
		if (!zipCode && !city) {
			throw new BadRequestError(
				'Failed to get organisations because neither the city nor the zipCode queryParams were provided'
			);
		}
		try {
			return await EducationOrganizationsController.getOrganizations(city, zipCode);
		} catch (err) {
			const error = new CustomError('Failed to get organisations by city', err, {
				city,
				zipCode,
			});
			logger.error(error);
			throw new InternalServerError(error.message, null, {
				city,
				zipCode,
			});
		}
	}

	@Path('/organisation-name')
	@GET
	async getOrganizationName(
		@QueryParam('organisationId') organisationId: string,
		@QueryParam('unitId') unitId: string
	): Promise<{ name: string | null }> {
		try {
			if (!organisationId) {
				throw new BadRequestError(
					'Failed to get organisation name because the organisationId query param must be provided'
				);
			}
			return {
				name: await EducationOrganizationsController.getOrganizationName(
					organisationId,
					unitId
				),
			};
		} catch (err) {
			const error = new CustomError('Failed to get organisation name', err, {
				organisationId,
				unitId,
			});
			logger.error(error);
			throw new InternalServerError(error.message, null, {
				organisationId,
				unitId,
			});
		}
	}
}
