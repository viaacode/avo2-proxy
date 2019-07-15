import _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import { Avo } from '@viaa/avo2-types';
import { GraphQlService } from '../../services/graphql';
import { NotFoundError } from 'typescript-rest/dist/server/model/errors';
import OrganizationService from '../organization/service';

interface GraphQlItemResponse {
	data: {
		app_item_meta: AppItemMetaItem[];
	};
}

interface AppItemMetaItem {
	bookmarks: null;
	browse_path: string;
	created_at: string;
	depublish_at: null;
	description: string;
	duration: string;
	expiry_date: null;
	external_id: string;
	id: number;
	is_deleted: boolean;
	is_orphaned: boolean;
	is_published: boolean;
	issued: string;
	issued_edtf: string;
	lom_classification: string[];
	lom_context: string[];
	lom_intendedenduserrole: string[];
	lom_keywords: string[];
	lom_languages: string[];
	lom_typicalagerange: string[];
	org_id: string;
	publish_at: null;
	series: string;
	thumbnail_path: string;
	title: string;
	type: Type;
	type_id: number;
	updated_at: string;
	views: null;
}

interface Type {
	id: number;
	label: string;
}

export default class ItemService {
	public static async getByItemId(itemId: string): Promise<Avo.Item.Response> {
		try {
			const query = /* GraphQL */ `
query getItemById($id: bpchar!) {
  app_item_meta(where: {external_id: {_eq: $id}}) {
    bookmarks {
      count
    }
    browse_path
    created_at
    depublish_at
    description
    duration
    expiry_date
    external_id
    id
    is_deleted
    is_orphaned
    is_published
    issued
    issued_edtf
    lom_classification
    lom_context
    lom_intendedenduserrole
    lom_keywords
    lom_languages
    lom_typicalagerange
    org_id
    publish_at
    series
    thumbnail_path
    title
    type {
      id
      label
    }
    type_id
    updated_at
    views {
      count
    }
  }
}
`;

			let response: GraphQlItemResponse;
			try {
				response = await GraphQlService.request<GraphQlItemResponse>(
					query,
					{ id: itemId });
			} catch (err) {
				throw new RecursiveError(
					'Failed to get collection by id',
					err,
					{
						itemId,
						method: 'post',
					});
			}

			const item: AppItemMetaItem = _.get(response, 'app_item_meta[0]');
			if (!item) {
				throw new NotFoundError(`item with id ${item} was not found.`);
			}

			return {
				...item,
				type: item.type.label as Avo.Core.ContentType,
				org_name: await OrganizationService.getOrganisationName(item.org_id),
			};
		} catch (err) {
			throw new RecursiveError('Failed to get item by id', err, { itemId });
		}
	}
}
