import DataService from './service';

export default class DataController {

	public static async execute(query: any, variables: any): Promise<any> {
		return DataService.execute(query, variables);
	}
}
