import { RecursiveError } from '../../helpers/recursiveError';
import { Avo } from '@viaa/avo2-types';
import { GraphQlService } from '../../services/graphql';
import { NotFoundError } from 'typescript-rest/dist/server/model/errors';
import * as _ from 'lodash';

interface GraphQlCollectionResponse {
	migrate_collections: MigrateCollectionsItem[];
}

interface MigrateCollectionsItem {
	fragments: FragmentsItem[];
	description: string;
	title: string;
	is_public: boolean;
	id: number;
	lom_references: any[];
	type_id: number;
	d_ownerid: number;
	created_at: string;
	updated_at: string;
	organisation_id: string;
	mediamosa_id: string;
}

interface FragmentsItem {
	id: number;
	custom_title: string;
	custom_description: null;
	start_oc: null | number;
	end_oc: null | number;
	external_id: Avo.Collection.ExternalId;
	updated_at: string;
	position: number;
	created_at: string;
}

const COLLECTION_PROPS = `
fragments {
  id
  custom_title
  custom_description
  start_oc
  end_oc
  external_id {
    external_id
    mediamosa_id
    type_label
  }
  updated_at
  position
  created_at
}
description
title
is_public
id
lom_references {
  lom_value
  id
}
type_id
d_ownerid
created_at
updated_at
organisation_id
mediamosa_id
`;

export default class CollectionService {

	public static async getById(collectionId: string): Promise<Avo.Collection.Response> {
		const query = /* GraphQL */ `
query getMigrateCollectionById($id: Int!) {
  migrate_collections(where: {id: {_eq: $id}}) {
    ${COLLECTION_PROPS}
  }
}
`;

		let response: GraphQlCollectionResponse;
		try {
			response = await GraphQlService.request<GraphQlCollectionResponse>(
				query,
				{ id: collectionId });
		} catch (err) {
			throw new RecursiveError(
				'Failed to get collection by id',
				err,
				{
					id: collectionId,
					method: 'post',
				});
		}

		const collection = _.get(response, 'migrate_collections[0]');
		if (!collection) {
			throw new NotFoundError(`collection with id ${collectionId} was not found.`);
		}

		return {
			...collection,
			owner: {} as Avo.User.Response, // TODO get owner from graphQL or do additional fetch in nodejs
		};
	}

	public static async getByOwnerId(ownerId: number): Promise<Avo.Collection.Response[]> {
		const query = /* GraphQL */ `
query getMigrateCollectionById($id: Int!) {
  migrate_collections(where: {d_ownerid: {_eq: $id}}) {
    ${COLLECTION_PROPS}
  }
}
`;

		let response: GraphQlCollectionResponse;
		try {
			response = await GraphQlService.request<GraphQlCollectionResponse>(
				query,
				{ ownerId });
		} catch (err) {
			throw new RecursiveError(
				'Failed to get collections by owner id',
				err,
				{
					ownerId,
					method: 'post',
				});
		}

		return _.get(response, 'migrate_collections', []);
	}
}
