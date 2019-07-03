import _ from 'lodash';
import { RecursiveError } from '../../helpers/recursiveError';
import {Avo} from '@viaa/avo2-types';
import { DUMMY_COLLECTIONS, GraphQlCollection } from './dummy-collections';
import { DUMMY_COLLECTION_FRAGMENTS } from './dummy-collection-fragments';
import { DUMMY_OWNER } from './dummy-owner';

export default class CollectionService {
	public static async get(id: string): Promise<Avo.Collection.Response> {
		try {
			// TODO replace dummy collections with actual data from the graphql database once it is available
			const graphQlCollection: GraphQlCollection | undefined = _.find(DUMMY_COLLECTIONS, {id: parseInt(id, 10)}) as GraphQlCollection | undefined;

			if (!graphQlCollection) {
				throw new RecursiveError('Failed to find collection by id', null, {id});
			}

			const fragments: Avo.Collection.Fragment[] = _.filter(DUMMY_COLLECTION_FRAGMENTS, (collectionFragment: Avo.Collection.Fragment) => {
				const includes = _.includes(graphQlCollection.collection_fragment_ids, collectionFragment.id);
				return includes;
			}) as Avo.Collection.Fragment[];

			const collection: Avo.Collection.Response = {
				...graphQlCollection,
				collection_fragments: fragments,
				owner: DUMMY_OWNER,
			};
			delete collection['collection_fragment_ids'];
			return collection;
		} catch (err) {
			throw new RecursiveError(
				'Failed to get collection info',
				err,
				{
					id,
					method: 'post',
				});
		}
	}
}
