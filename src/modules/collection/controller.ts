import {Avo} from '@viaa/avo2-types';
import { RecursiveError } from '../../helpers/recursiveError';
import CollectionService from './service';

export default class CollectionController {

	public static async getByCollectionId(collectionId: string): Promise<Avo.Collection.Response> {
		try {
			return await CollectionService.getById(collectionId);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to get collection by collection id, are you connected to the VIAA VPN?',
					err,
					{ collectionId }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to get collection',
					err,
					{ collectionId });
			}
		}
	}

	public static async getByOwnerId(ownerId: number): Promise<Avo.Collection.Response[]> {
		try {
			return await CollectionService.getByOwnerId(ownerId);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to get collections by owner id, are you connected to the VIAA VPN?',
					err,
					{ ownerId }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to get collection',
					err,
					{ ownerId });
			}
		}
	}
}
