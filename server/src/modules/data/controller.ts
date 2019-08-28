import DataService from './service';

export default class DataController {

	public static async execute(query: string, variables: {[varName: string]: any}): Promise<any> {
		return DataService.execute(query, variables);
	}
}
