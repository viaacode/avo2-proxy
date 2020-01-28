import { default as loggerPresets } from './presets/logger';
import { EnvHelper } from './helpers/env';
import { IConfig } from './config.types';

export default {
	state: {
		env: process.env.NODE_ENV,
		docs: EnvHelper.envToBoolean('STATE_DOCS'),
		production: EnvHelper.envToBoolean('STATE_PRODUCTION'),
		test: EnvHelper.envToBoolean('STATE_TEST'),
	},
	server: {
		host: 'HOST',
		port: EnvHelper.envToNumber('PORT'),
		timezone: 'TZ',
	},
	logger: loggerPresets['LOGGING_PRESET'],
} as IConfig;
