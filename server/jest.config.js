module.exports = {
	displayName: 'SERVER',
	rootDir: '.',
	preset: 'ts-jest',
	testEnvironment: 'node',
	testTimeout: 60000,
	globals: {
		'ts-jest': {
			diagnostics: false,
		},
	},
	collectCoverage: true,
	collectCoverageFrom: [
		'<rootDir>/src/**/*.ts',
	],
	coverageDirectory: './test/coverage',
	coverageReporters: [
		'lcov',
		'text',
	],
	coverageThreshold: {
		global: {
			branches: 30,
			functions: 40,
			lines: 50,
			statements: 50,
		},
	},
	moduleFileExtensions: [
		'js',
		'json',
		'ts',
	],
	transform: {
		'.*/.ts$': 'ts-jest',
	},
	testMatch: [
		'<rootDir>/src/**/*.spec.[jt]s',
		'<rootDir>/test/**/*.spec.[jt]s',
	],
	setupFiles: [
		'<rootDir>/test/index.ts',
	],
	setupFilesAfterEnv: [
		'jest-extended',
	],
};
