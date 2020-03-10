import { GET, Path } from 'typescript-rest';

import { InternalServerError } from '../../shared/helpers/error';

import TranslationsController from './controller';

@Path('/translations')
export default class TranslationsRoute {
	// retrieve NL translations file in json format
	@Path('nl.json')
	@GET
	async getFrontendTranslationsJson(): Promise<any> {
		try {
			return await TranslationsController.getTranslationsJSON('front-end');
		} catch (err) {
			throw new InternalServerError(
				'Failed to generate front-end translations json',
				err
			);
		}
	}
}
