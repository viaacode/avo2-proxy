import { get, isNil } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { PermissionName } from '../../shared/permissions';

import CollectionsService from './collections.service';

export default class CollectionsController {
	public static async fetchCollectionWithItemsById(
		id: string,
		type: 'collection' | 'bundle',
		assignmentId: number | undefined,
		avoUser: Avo.User.User
	): Promise<Avo.Collection.Collection | {} | null> {
		const collection: Avo.Collection.Collection | null = await CollectionsService.fetchCollectionOrBundleWithItemsById(
			id,
			type
		);

		const isOwner =
			collection.owner_profile_id && collection.owner_profile_id === avoUser.profile.id;
		const isLinkedToAssignment = isNil(assignmentId)
			? false
			: await CollectionsService.isCollectionLinkedToAssignment(id, assignmentId);
		const isAllowedToViewBundle =
			type === 'bundle' &&
			((collection.is_public &&
				avoUser.profile.permissions.includes(PermissionName.VIEW_ANY_PUBLISHED_BUNDLES)) ||
				(!collection.is_public &&
					avoUser.profile.permissions.includes(
						PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES
					)));
		const isAlllowedToViewCollection =
			type === 'collection' &&
			((collection.is_public &&
				avoUser.profile.permissions.includes(
					PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS
				)) ||
				(!collection.is_public &&
					avoUser.profile.permissions.includes(
						PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS
					)));

		// Return the collection/bundle if:
		// - User is the owner of the collection.
		// - User is not logged in.
		// - Collection or bundle is linked to an assignment.
		// - User is allowed to see bundle.
		// - User is allowed to see collection.
		if (
			!avoUser ||
			isOwner ||
			isLinkedToAssignment ||
			isAllowedToViewBundle ||
			isAlllowedToViewCollection
		) {
			return collection;
		}

		return null;
	}

	public static async fetchItemExternalIdByMediamosaId(id: string): Promise<string | null> {
		return CollectionsService.fetchItemExternalIdByMediamosaId(id);
	}

	public static async fetchUuidByAvo1Id(id: string): Promise<string | null> {
		return CollectionsService.fetchUuidByAvo1Id(id);
	}
}
