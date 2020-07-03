import { Avo } from '@viaa/avo2-types';

import CollectionsService from './collections.service';

export default class CollectionsController {
	public static async fetchCollectionOrBundleWithItemsById(
		id: string,
		type: 'collection' | 'bundle'
	): Promise<Avo.Collection.Collection | null> {
		return CollectionsService.fetchCollectionOrBundleWithItemsById(id, type);
	}

	public static async fetchItemExternalIdByMediamosaId(id: string): Promise<string | null> {
		return CollectionsService.fetchItemExternalIdByMediamosaId(id);
	}

	public static async fetchUuidByAvo1Id(id: string): Promise<string | null> {
		return CollectionsService.fetchUuidByAvo1Id(id);
	}
}
