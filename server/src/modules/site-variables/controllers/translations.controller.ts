import { get } from 'lodash';

import {
	ExternalServerError,
	NotFoundError,
} from '../../../shared/helpers/error';
import DataService from '../../data/service';

import { GET_SITE_VARIABLES_BY_NAME } from '../queries.gql';
import { SiteVariable } from '../types';

export default class TranslationsController {
	public static async getTranslationsJSON(
		context: 'frontend' | 'backend'
	): Promise<any> {
		const errorMetaData = {
			context,
			query: GET_SITE_VARIABLES_BY_NAME,
		};

		try {
			// retrieve translations variable according to given context
			const response: Promise<Partial<
				SiteVariable
			>[]> = await DataService.execute(GET_SITE_VARIABLES_BY_NAME, {
				name: `translations-${context}`,
			});

			// retrieve translations from response
			const translations: Partial<SiteVariable> | null = get(
				response,
				'data.app_site_variables[0]'
			);

			// handle missing translations
			if (!translations) {
				throw new NotFoundError('Translations not found', null, errorMetaData);
			}

			return translations;
		} catch (err) {
			// handle error
			throw new ExternalServerError('Failed to retrieve translations', err, errorMetaData);
		}
	}
}
