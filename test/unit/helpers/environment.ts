import 'jest-extended';
import EnvironmentHelper from '../../../src/helpers/environment';

describe('Environment helper', () => {
	it('Should throw an error when NODE_ENV is not valid', () => {
		const env = {
			NODE_ENV: 'invalid',
		};

		expect(() => {
			EnvironmentHelper(env);
		}).toThrowWithMessage(Error, 'NODE_ENV_NOT_VALID');
	});

	it('Should see if the `local` environment is valid', () => {
		const env = {
			NODE_ENV: 'local',
		};

		expect(() => {
			EnvironmentHelper(env);
		}).not.toThrow(Error);
	});

	it('Should see if the `test` environment is valid', () => {
		const env = {
			NODE_ENV: 'test',
		};

		expect(() => {
			EnvironmentHelper(env);
		}).not.toThrow(Error);
	});

	it('Should see if the `staging` environment is valid', () => {
		const env = {
			NODE_ENV: 'staging',
		};

		expect(() => {
			EnvironmentHelper(env);
		}).not.toThrow(Error);
	});

	it('Should see if the `production` environment is valid', () => {
		const env = {
			NODE_ENV: 'production',
		};

		expect(() => {
			EnvironmentHelper(env);
		}).not.toThrow(Error);
	});

	it('Should set the environment to the default environment when missing', () => {
		const env = {};

		EnvironmentHelper(env as any);

		expect(process.env.NODE_ENV).toBeString();
		expect(process.env.NODE_ENV).toBe('local');
	});
});
