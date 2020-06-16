import EducationLevelsService from './service';

export default class EducationLevelsController {
	public static async getEducationLevels(): Promise<any> {
		return await EducationLevelsService.getEducationLevels();
	}
}
