import DataService from './service';
import _ from 'lodash';
import { IncomingHttpHeaders } from 'http';
import { logger } from '../../shared/helpers/logger';

export default class DataController {

	public static async execute(query: string, variables: { [varName: string]: any }, allHeaders: IncomingHttpHeaders): Promise<any> {
		// Copy trace id from nginx proxy to a header that hasura will understand
		// TODO check if trace id header is correct
		logger.info(`data route headers:
${JSON.stringify(allHeaders, null, 2)}`);
		const traceId = allHeaders['x-viaa-trace-id-header'] as string | undefined;
		const headers: { [headerName: string]: string } = {};
		if (traceId) {
			headers['x-hasura-trace-id'] = traceId;
		}

		// Execute the graphql query
		let response = await DataService.execute(query, variables, headers);
		response = this.filterAppMetaData(response);
		return response;
	}

	/**
	 * Filters items that are deleted or orphaned and adds errors
	 * @param response response from graphql
	 */
	private static filterAppMetaData(response: any): { items: any[], errors: string[] } {
		// TODO re-enable once the frontend doesn't use browse_path and thumbnail_path anymore
		// const items = _.get(response, 'data.app_item_meta');
		// if (items && items.length) {
		// 	const errors: string[] = [];
		// 	response.data.app_item_meta = _.compact((items || []).map((item: any) => {
		// 		delete item.browse_path;
		// 		delete item.thumbnail_path;
		// 		if (item.is_deleted) {
		// 			errors.push('DELETED');
		// 			return null;
		// 		}
		// 		return item;
		// 	}));
		// 	if (errors && errors.length) {
		// 		response.errors = errors.map((error: string) => {
		// 			return {
		// 				message: error,
		// 			};
		// 		});
		// 	}
		// }
		return response;
	}
}
