module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		".*/.ts$": "ts-jest"
	},
	testMatch: [
		"**/test/**/*.[jt]s?(x)",
	],
	moduleFileExtensions: [
		"ts",
		"tsx",
		"js",
		"jsx",
		"json",
		"node"
	],
	setupFilesAfterEnv: ["jest-extended"]
};
