import { get, isNil } from 'lodash';

import type { Avo } from '@viaa/avo2-types';

import { PermissionName } from '../../shared/permissions';

import CollectionsService from './collections.service';

export default class CollectionsController {
	public static async fetchCollectionWithItemsById(
		id: string,
		type: 'collection' | 'bundle',
		assignmentUuid: string | undefined,
		avoUser: Avo.User.User,
		includeFragments: boolean,
	): Promise<Avo.Collection.Collection | null> {
		const collection: Avo.Collection.Collection | null = await CollectionsService.fetchCollectionOrBundleWithItemsById(
			id,
			type,
			avoUser,
			includeFragments
		);
		const isOwner =
			collection.owner_profile_id &&
			collection.owner_profile_id === get(avoUser, 'profile.id');
		const isLinkedToAssignment = isNil(assignmentUuid)
			? false
			: await CollectionsService.isCollectionLinkedToAssignment(id, assignmentUuid);
		const permissions: string[] = get(avoUser, 'profile.permissions') || [];
		const { is_public } = collection;

		// Return the collection/bundle if:
		// - User is the owner of the collection.
		// - User is not logged in and the collection or bundle is public
		// - Collection or bundle is linked to an assignment.
		// - User is allowed to see bundle.
		// - User is allowed to see collection.
		if (
			(!avoUser && is_public) ||
			isOwner ||
			isLinkedToAssignment ||
			(type === 'bundle' &&
				((is_public && permissions.includes(PermissionName.VIEW_ANY_PUBLISHED_BUNDLES)) ||
					(!is_public &&
						permissions.includes(PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES)))) ||
			(type === 'collection' &&
				((is_public &&
					permissions.includes(PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS)) ||
					(!is_public &&
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
