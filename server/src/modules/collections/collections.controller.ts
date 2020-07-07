import { isNil } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import CollectionsService from './collections.service';

export default class CollectionsController {
	public static async fetchCollectionWithItemsById(
		id: string,
		type: 'collection' | 'bundle',
		assignmentId: number | undefined,
		avoUser: Avo.User.User
	): Promise<Avo.Collection.Collection | null> {
		const collection: Avo.Collection.Collection | null = await CollectionsService.fetchCollectionOrBundleWithItemsById(
			id,
			type
		);
		const isLinkedToAssignment = isNil(assignmentId)
			? false
			: await CollectionsService.isCollectionLinkedToAssignment(id, assignmentId);
		if (
			!isLinkedToAssignment &&
			!collection.is_public && collection.owner_profile_id !== avoUser.profile.id
		) {
			return null;
		}
		return collection;
	}

	public static async fetchItemExternalIdByMediamosaId(id: string): Promise<string | null> {
		return CollectionsService.fetchItemExternalIdByMediamosaId(id);
	}

	public static async fetchUuidByAvo1Id(id: string): Promise<string | null> {
		return CollectionsService.fetchUuidByAvo1Id(id);
	}
}
