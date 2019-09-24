import 'jest';
import supertest from 'supertest';
import { App } from '../../app';

const api = supertest(new App(false).app);

describe('GraphQl data route', () => {
	it('should return data for query without variables', async () => {
		const response: supertest.Response = await api
			.post('/data')
			.send({
				query: '{vocabularies_enum_lom_context{description}}',
			});
		expect(response.body).toBeDefined();
		expect(response.body.data.vocabularies_enum_lom_context).toBeDefined();
		expect(response.body.data.vocabularies_enum_lom_context).toBeArray();
		expect(response.body.data.vocabularies_enum_lom_context[0].description).toBeString();
	});

// 	it('should return data for query with variables but omit protected fields', async () => {
// 		const ITEM_QUERY = `
// 	query getItemById($id: bpchar!) {
// 		app_item_meta(where: { external_id: { _eq: $id } }) {
// 			external_id
// 			browse_path
// 			thumbnail_path
// 			title
// 		}
// 	}
// `;
// 		const EXTERNAL_ID = '2f7jq1gs22';
// 		const response: supertest.Response = await api
// 			.post('/data')
// 			.send({
// 				query: ITEM_QUERY,
// 				variables: {
// 					id: EXTERNAL_ID,
// 				},
// 			});
// 		expect(response.body).toBeDefined();
// 		expect(response.body.data.app_item_meta).toBeDefined();
// 		expect(response.body.data.app_item_meta).toBeArray();
// 		expect(response.body.data.app_item_meta[0].external_id).toEqual(EXTERNAL_ID);
// 		expect(response.body.data.app_item_meta[0].title).toBeString();
// 		expect(response.body.data.app_item_meta[0].browse_path).toBeUndefined();
// 		expect(response.body.data.app_item_meta[0].thumbnail_path).toBeUndefined();
// 	});
});
