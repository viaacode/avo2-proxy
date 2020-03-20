import { GET, Path } from 'typescript-rest';
import memoize from 'memoizee';

import { InternalServerError } from '../../../shared/helpers/error';

import TranslationsController from '../controllers/translations.controller';

@Path('/translations')
export default class TranslationsRoute {
	@Path('nl.json')
	@GET
	async getFrontendTranslationsJson(): Promise<any> {
		try {
			const memoizeTranslations = memoize(async () => await TranslationsController.getTranslationsJSON('frontend'), { maxAge: 3600000 });

			return memoizeTranslations();
		} catch (err) {
			throw new InternalServerError(
				'Failed to generate front-end translations json',
				err
			);
		}
	}
}
