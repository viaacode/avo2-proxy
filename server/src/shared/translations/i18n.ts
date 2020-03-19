import i18n from 'i18next';

import { logger } from '../helpers/logger';

import TranslationsController from '../../modules/site-variables/controllers/translations.controller';

const retrieveBackendTranslations = async () => {
	try {
		// retrieve back-end translations from graphql interface
		const backendTranslations = await TranslationsController.getTranslationsJSON(
			'back-end'
		);

		return backendTranslations;
	} catch (err) {
		// handle error
		logger.error('failed to retrieve back-end translations');
	}
};

// initialize translation module
i18n.init({
	debug: process.env.NODE_ENV === 'local',
	keySeparator: '^',
	nsSeparator: '^',
	lng: 'nl',
	fallbackLng: 'nl',
	interpolation: {
		escapeValue: false,
	},
});

// apply translations
retrieveBackendTranslations().then((translations) => {
	i18n.addResources('nl', 'translation', translations.value);
});

export default i18n;
