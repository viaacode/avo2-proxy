import { get } from 'lodash';

import DataService from '../data/service';
import { GET_TRANSLATIONS } from './queries.gql';
import { ExternalServerError, NotFoundError } from '../../shared/helpers/error';
import { SiteVariable } from './types';

export default class TranslationsController {
	public static async getTranslationsJSON(
		context: 'front-end' | 'back-end'
	): Promise<any> {
		try {
			const response: Promise<Partial<
				SiteVariable
			>[]> = await DataService.execute(GET_TRANSLATIONS, {
				name: `translations-${context}`,
			});

			const translations: Partial<SiteVariable> | null = get(
				response,
				'data.app_site_variables[0]'
			);

			if (!translations) {
				throw new NotFoundError('Translations not found', null, {
					context,
					query: GET_TRANSLATIONS,
				});
			}

			return translations;
		} catch (err) {
			throw new ExternalServerError('Failed to retrieve translations', err, {
				context,
				query: GET_TRANSLATIONS,
			});
		}
	}
}
