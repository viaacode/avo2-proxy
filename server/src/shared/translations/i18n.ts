import i18n from 'i18next';

import translations from './nl.json';

i18n.init({
	debug: process.env.NODE_ENV === 'local',
	resources: {
		nl: {
			translation: translations,
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
