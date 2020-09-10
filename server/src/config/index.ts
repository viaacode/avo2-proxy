import { IConfig } from './config.types';
import { EnvHelper } from './helpers/env';

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
} as IConfig;
