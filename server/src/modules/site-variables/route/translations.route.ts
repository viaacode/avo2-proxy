import memoize from 'memoizee';
import { GET, Path } from 'typescript-rest';

import { InternalServerError } from '../../../shared/helpers/error';
import { logger } from '../../../shared/helpers/logger';
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
			const error = new InternalServerError(
				'Failed to generate front-end translations json',
				err
			);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
