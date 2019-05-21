import * as ValidationHelper from './validation';
import ProcessEnv = NodeJS.ProcessEnv;

export default (env: ProcessEnv): void => {
	// Set NODE_ENV to local if missing
	env.NODE_ENV = env.NODE_ENV || 'local';

	process.env = ValidationHelper.validator(ValidationHelper.presets.nodeEnvironment, 'NODE_ENV_NOT_VALID', env);
};
