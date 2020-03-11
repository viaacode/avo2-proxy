import i18n from 'i18next';

import { logger } from '../../shared/helpers/logger';

import TranslationsController from '../../modules/site-variables/controllers/translations.controller';

const retrieveBackendTranslations = async () => {
	logger.info('retrieving back-end translations...');

	try {
		// retrieve back-end translations from graphql interface
		const backendTranslations = await TranslationsController.getTranslationsJSON(
			'back-end'
		);

		logger.info('retrieving back-end translations... done');

		return backendTranslations;
	} catch (err) {
		// handle error
		logger.error('failed to retrieve back-end translations');
	}
};

// initialize translations
i18n.init({
	debug: process.env.NODE_ENV === 'local',
	resources: {
		nl: {
			translation: retrieveBackendTranslations(),
		},
	},
	keySeparator: '^',
	nsSeparator: '^',
	lng: 'nl',
	fallbackLng: 'nl',
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
