import {Avo} from '@viaa/avo2-types';
import { RecursiveError } from '../../helpers/recursiveError';
import CollectionService from './service';

export default class CollectionController {

	public static async get(id: string): Promise<Avo.Collection.Response> {
		try {
			return await CollectionService.get(id);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to get collection, are you connected to the VIAA VPN?',
					err,
					{ id }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to get collection',
					err,
					{ id });
			}
		}
	}
}
