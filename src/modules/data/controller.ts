import DataService from './service';

export default class DataController {

	public static async execute(queryBody: any): Promise<any> {
		return DataService.execute(queryBody);
	}
}
