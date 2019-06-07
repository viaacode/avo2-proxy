module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		".*/.ts$": "ts-jest"
	},
	testMatch: [
		"**/test/**/*.[jt]s?(x)",
		"**/src/**/*.spec.ts",
	],
	moduleFileExtensions: [
		"ts",
		"tsx",
		"js",
		"jsx",
		"node"
	],
	setupFilesAfterEnv: ["jest-extended"]
};
