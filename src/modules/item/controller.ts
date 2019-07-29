import {Avo} from '@viaa/avo2-types';
import { RecursiveError } from '../../helpers/recursiveError';
import ItemService from './service';

export default class ItemController {

	public static async getItemById(itemId: string): Promise<Avo.Item.Response> {
		try {
			return await ItemService.getByItemId(itemId);
		} catch (err) {
			if (err.statusText === 'Bad Request') {
				throw new RecursiveError(
					'Failed to get item, are you connected to the VIAA VPN?',
					err,
					{ itemId }); // TODO remove dev error
			} else {
				throw new RecursiveError(
					'Failed to get item',
					err,
					{ itemId });
			}
		}
	}
}
