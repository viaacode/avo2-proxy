import { get } from 'lodash';

import EducationLevelsService from './service';

export default class EducationLevelsController {
	public static async getEducationLevels(): Promise<string[]> {
		return await EducationLevelsService.getEducationLevels();
	}
}
