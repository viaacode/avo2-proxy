import { logger } from './logger';

describe('[UNIT - SHARED] Logger', () => {
	it('Should export an instance of the logger', (done: jest.DoneCallback) => {
		expect(logger).toBeDefined();
		expect(logger.debug).toBeFunction();
		expect(logger.info).toBeFunction();
		expect(logger.warn).toBeFunction();
		expect(logger.error).toBeFunction();
		done();
	});
});
