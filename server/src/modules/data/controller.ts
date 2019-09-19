import DataService from './service';
import _ from 'lodash';

export default class DataController {

	public static async execute(query: string, variables: { [varName: string]: any }): Promise<any> {
		let response = await DataService.execute(query, variables);
		response = this.filterAppMetaData(response);
		return response;
	}

	/**
	 * Filters items that are deleted or orphaned and adds errors
	 * @param response response from graphql
	 */
	private static filterAppMetaData(response: any): { items: any[], errors: string[] } {
		const items = _.get(response, 'data.app_item_meta');
		if (items && items.length) {
			const errors: string[] = [];
			response.data.app_item_meta = _.compact((items || []).map((item: any) => {
				delete item.browse_path;
				delete item.thumbnail_path;
				if (item.is_deleted) {
					errors.push('DELETED');
					return null;
				}
				return item;
			}));
			if (errors && errors.length) {
				response.errors = errors.map((error: string) => {
					return {
						message: error,
					};
				});
			}
		}
		return response;
	}
}
