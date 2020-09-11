import i18n from 'i18next';
import { get } from 'lodash';

import TranslationsController from '../../modules/site-variables/controllers/translations.controller';
import { ExternalServerError, InternalServerError } from '../helpers/error';
import { logger } from '../helpers/logger';

const retrieveBackendTranslations = async () => {
	try {
		// retrieve back-end translations from graphql interface
		return await TranslationsController.getTranslationsJSON('backend');
	} catch (err) {
		logger.error(new InternalServerError('failed to retrieve back-end translations', err));
	}
};

// initialize translation module
i18n.init({
	debug: false, // process.env.NODE_ENV === 'local',
	keySeparator: '^',
	nsSeparator: '^',
	lng: 'nl',
	fallbackLng: 'nl',
	interpolation: {
		escapeValue: false,
	},
});

// apply translations
retrieveBackendTranslations()
	.then(translations => {
		i18n.addResources('nl', 'translation', get(translations, 'value'));
	})
	.catch(err => {
		logger.error(new ExternalServerError('Failed to fetch translations from backend', err));
	});

export default i18n;
