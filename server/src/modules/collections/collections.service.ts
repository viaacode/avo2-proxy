import { compact, get, unset } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { CustomError } from '../../shared/helpers/error';
import { PermissionName } from '../../shared/permissions';
import { AuthService } from '../auth/service';
import DataService from '../data/data.service';

import {
	GET_COLLECTION_BY_ID,
	GET_COLLECTIONS_BY_AVO1_ID,
	GET_COLLECTIONS_BY_IDS,
	GET_COLLECTIONS_LINKED_TO_ASSIGNMENT,
	GET_EXTERNAL_ID_BY_MEDIAMOSA_ID,
	GET_ITEMS_BY_IDS,
	GET_PUBLIC_COLLECTIONS_OR_BUNDLES,
} from './collections.queries.gql';
import { ContentTypeNumber } from './collections.types';

export default class CollectionsService {
	/**
	 * Retrieve collection or bundle and underlying items or collections by id.
	 *
	 * @param collectionId Unique id of the collection that must be fetched.
	 * @param type Type of which items should be fetched.
	 *
	 * @param user
	 * @param includeFragments
	 * @returns Collection or bundle.
	 */
	static async fetchCollectionOrBundleWithItemsById(
		collectionId: string,
		type: 'collection' | 'bundle',
		user: Avo.User.User,
		includeFragments: boolean,
	): Promise<Avo.Collection.Collection | null> {
		try {
			// retrieve collection or bundle by id
			const collectionOrBundle = await CollectionsService.fetchCollectionOrBundleById(
				collectionId,
				type
			);

			// handle empty response
			if (!collectionOrBundle) {
				return undefined;
			}

			// omit management info if user does not have adequate permissions
			if (get(collectionOrBundle, 'management')) {
				if (
					(type === 'collection' &&
						!AuthService.hasPermission(
							user,
							PermissionName.VIEW_COLLECTION_EDITORIAL_OVERVIEWS
						)) ||
					(type === 'bundle' &&
						!AuthService.hasPermission(
							user,
							PermissionName.VIEW_BUNDLE_EDITORIAL_OVERVIEWS
						))
				) {
					unset(collectionOrBundle, 'management');
				}
			}

			if (includeFragments) {
				// retrieve items/collections for each collection_fragment that has an external_id set
				const ids: string[] = compact(
					(collectionOrBundle.collection_fragments || []).map((collectionFragment, index) => {
						// reset positions to a list of ordered integers, db ensures sorting on previous position
						collectionFragment.position = index;

						// return external id if set
						if (collectionFragment.type !== 'TEXT') {
							return collectionFragment.external_id;
						}

						return null;
					})
				);

				try {
					// retrieve items of collection or bundle
					const response = await DataService.execute(
						type === 'collection' ? GET_ITEMS_BY_IDS : GET_COLLECTIONS_BY_IDS,
						{ ids }
					);

					// Add infos to each fragment under the item_meta property
					const itemInfos: (Avo.Collection.Collection | Avo.Item.Item)[] = get(
						response,
						'data.items',
						[]
					);
					collectionOrBundle.collection_fragments.forEach((fragment) => {
						const itemInfo = itemInfos.find(
							(item) =>
								fragment.external_id ===
								(type === 'collection' ? item.external_id : item.id)
						);

						if (itemInfo) {
							fragment.item_meta = itemInfo;
							if (!fragment.use_custom_fields) {
								fragment.custom_description = itemInfo.description;
								fragment.custom_title = itemInfo.title;
							}
						}
					});
				} catch (err) {
					throw new CustomError('Failed to get fragments inside the collection', err, {
						ids,
					});
				}
			}
			return collectionOrBundle;
		} catch (err) {
			throw new CustomError('Failed to get collection or bundle with items', err, {
				collectionId,
				type,
				includeFragments,
			});
		}
	}

	/**
	 * Retrieve collection or bundle by id.
	 *
	 * @param collectionId Unique id of the collection that must be fetched.
	 * @param type Type of which items should be fetched.
	 *
	 * @returns Collection or bundle.
	 */
	static async fetchCollectionOrBundleById(
		collectionId: string,
		type?: 'collection' | 'bundle'
	): Promise<Avo.Collection.Collection | null> {
		try {
			const response = await DataService.execute(GET_COLLECTION_BY_ID, { id: collectionId });

			if (response.errors) {
				throw new CustomError(
					`Failed to retrieve ${type} from database because of graphql errors`,
					null,
					{
						collectionId,
						errors: response.errors,
					}
				);
			}

			const collectionObj: Avo.Collection.Collection | null = get(
				response,
				'data.app_collections[0]'
			);

			if (!collectionObj) {
				throw new CustomError(`query for ${type} returned empty result`, null, {
					collectionId,
					response,
				});
			}
			// Collection/bundle loaded successfully
			// If we find a bundle but the function type param asked for a collection, we return undefined (and vice versa)
			if (type && collectionObj.type_id !== ContentTypeNumber[type]) {
				return null;
			}

			return collectionObj;
		} catch (err) {
			throw new CustomError('Failed to fetch collection or bundle by id', err, {
				collectionId,
				type,
				query: 'GET_COLLECTION_BY_ID',
			});
		}
	}

	static async fetchItemExternalIdByMediamosaId(mediamosaId: string): Promise<string | null> {
		try {
			const response = await DataService.execute(GET_EXTERNAL_ID_BY_MEDIAMOSA_ID, {
				mediamosaId,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}

			const externalId = get(response, 'data.migrate_reference_ids[0].external_id') || null;
			return externalId;
		} catch (err) {
			throw new CustomError('Failed to get item by media mosa id (avo1 id)', err, {
				mediamosaId,
				query: GET_EXTERNAL_ID_BY_MEDIAMOSA_ID,
			});
		}
	}

	static async fetchUuidByAvo1Id(avo1Id: string): Promise<string | null> {
		try {
			const response = await DataService.execute(GET_COLLECTIONS_BY_AVO1_ID, {
				avo1Id,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}

			return get(response, 'data.items[0].id') || null;
		} catch (err) {
			throw new CustomError('Failed to get collection or bundle uuid by their avo1 id', err, {
				avo1Id,
				query: GET_COLLECTIONS_BY_AVO1_ID,
			});
		}
	}

	static async fetchPublicCollectionUuids(): Promise<
		{
			id: string;
			updated_at: string;
			type_id: 3 | 4;
		}[]
	> {
		try {
			const response = await DataService.execute(GET_PUBLIC_COLLECTIONS_OR_BUNDLES);

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}

			return get(response, 'data.app_collections') || [];
		} catch (err) {
			throw new CustomError('Failed to get public collection', err, {
				query: GET_PUBLIC_COLLECTIONS_OR_BUNDLES,
			});
		}
	}

	static async isCollectionLinkedToAssignment(
		collectionUuid: string,
		assignmentUuid: string
	): Promise<boolean> {
		try {
			const response = await DataService.execute(GET_COLLECTIONS_LINKED_TO_ASSIGNMENT, {
				collectionUuid,
				assignmentUuid,
			});

			if (response.errors) {
				throw new CustomError('Response contains graphql errors', null, { response });
			}

			return !!get(response, 'data.app_assignments[0]');
		} catch (err) {
			throw new CustomError('Failed to check isCollectionLinkedToAssignment', err, {
				collectionUuid,
				query: GET_COLLECTIONS_LINKED_TO_ASSIGNMENT,
			});
		}
	}
}
