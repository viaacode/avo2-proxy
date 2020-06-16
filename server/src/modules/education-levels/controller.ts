import { get } from 'lodash';

import EducationLevelsService from './service';

export default class EducationLevelsController {
	public static async getEducationLevels(): Promise<any> {
		const response = await EducationLevelsService.getEducationLevels();

		const educationLevels = get(response, 'data.lookup_enum_lom_context', []);

		return educationLevels;
	}
}
