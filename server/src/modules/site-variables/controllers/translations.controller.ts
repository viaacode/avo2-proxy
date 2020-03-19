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
		try {
			const response: Promise<Partial<
				SiteVariable
			>[]> = await DataService.execute(GET_SITE_VARIABLES_BY_NAME, {
				name: `translations-${context}`,
			});

			const translations: Partial<SiteVariable> | null = get(
				response,
				'data.app_site_variables[0]'
			);

			if (!translations) {
				throw new NotFoundError('Translations not found', null, {
					context,
					query: GET_SITE_VARIABLES_BY_NAME,
				});
			}

			return translations;
		} catch (err) {
			throw new ExternalServerError('Failed to retrieve translations', err, {
				context,
				query: GET_SITE_VARIABLES_BY_NAME,
			});
		}
	}
}
