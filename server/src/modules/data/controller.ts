import DataService from './service';
import _ from 'lodash';

export default class DataController {

	public static async execute(query: string, variables: { [varName: string]: any }): Promise<any> {
		let data = await DataService.execute(query, variables);
		data = this.filterAppMetaData(data);
		return data;
	}

	/**
	 * Filters items that are deleted or orphaned and adds errors
	 * @param data response from graphql
	 */
	private static filterAppMetaData(data: any): { items: any[], errors: string[] } {
		const items = _.get(data, 'data.app_item_meta');
		if (items && items.length) {
			const errors: string[] = [];
			data.data.app_item_meta = _.compact((items || []).map((item: any) => {
				delete item.app_item_meta;
				if (item.is_deleted) {
					errors.push('DELETED');
					return null;
				}
				return item;
			}));
			if (errors && errors.length) {
				data.errors = errors.map((error: string) => {
					return {
						message: error,
					};
				});
			}
		}
		return data;
	}
}
