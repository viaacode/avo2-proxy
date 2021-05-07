import { get, isNil } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { PermissionName } from '../../shared/permissions';

import CollectionsService from './collections.service';

export default class CollectionsController {
	public static async fetchCollectionWithItemsById(
		id: string,
		type: 'collection' | 'bundle',
		assignmentUuid: string | undefined,
		avoUser: Avo.User.User
	): Promise<Avo.Collection.Collection | null> {
		const collection: Avo.Collection.Collection | null = await CollectionsService.fetchCollectionOrBundleWithItemsById(
			id,
			type,
			avoUser
		);

		const isOwner =
			get(collection, 'owner_profile_id') &&
			get(collection, 'owner_profile_id') === get(avoUser, 'profile.id');
		const isLinkedToAssignment = isNil(assignmentUuid)
			? false
			: await CollectionsService.isCollectionLinkedToAssignment(id, assignmentUuid);
		const permissions: string[] = get(avoUser, 'profile.permissions') || [];
		const isPublic = get(collection, 'is_public');

		// Return the collection/bundle if:
		// - User is the owner of the collection.
		// - User is not logged in and the collection or bundle is public
		// - Collection or bundle is linked to an assignment.
		// - User is allowed to see bundle.
		// - User is allowed to see collection.
		if (
			(!avoUser && isPublic) ||
			isOwner ||
			isLinkedToAssignment ||
			(type === 'bundle' &&
				((isPublic && permissions.includes(PermissionName.VIEW_ANY_PUBLISHED_BUNDLES)) ||
					(!isPublic &&
						permissions.includes(PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES)))) ||
			(type === 'collection' &&
				((isPublic &&
					permissions.includes(PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS)) ||
					(!isPublic &&
						permissions.includes(PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS))))
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
