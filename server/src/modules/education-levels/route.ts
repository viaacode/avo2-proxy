import { GET, Path } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';

import EducationLevelsController from './controller';

@Path('/education-levels')
export default class EducationLevelsRoute {
	@Path('')
	@GET
	async getEducationLevels(): Promise<any[]> {
		try {
			return await EducationLevelsController.getEducationLevels();
		} catch (err) {
			throw new InternalServerError('Failed to get education levels from graphql.', err);
		}
	}
}
