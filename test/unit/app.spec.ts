import * as sinon from 'sinon';
import app from '../../src/app';

describe('App', () => {

	// NOTE: There is no way to unit test the graceful shutdown for the SIGINT signal,
	// since Mocha also uses this signal to end it's process and therefore running the tests would be terminated.
	// Provided the SIGINT signal would trigger the same mechanism, this should be fine.
	describe('Graceful shutdown', () => {
		let sandbox;

		let closeStub;
		let exitStub;
		let logErrorStub;
		let logInfoStub;
		let server;

		beforeEach(() => {
			server = app.listen(process.env.PORT);
			sandbox = sinon.createSandbox({ useFakeTimers: true });

			exitStub = sandbox.stub(process, 'exit');
		});

		afterEach(() => {
			sandbox.restore();
			server.close();
		});

		afterAll(() => {
			process.removeAllListeners('SIGTERM');
			process.removeAllListeners('SIGINT');
		});

		it('should handle graceful shutdown when receiving a termination signal (no error)', (done) => {
			closeStub = sandbox.stub(server, 'close').callsFake((cb) => {
				cb();
			});

			process.once('SIGTERM', () => {
				sinon.assert.calledOnce(logInfoStub);
				sinon.assert.notCalled(logErrorStub);
				sinon.assert.calledOnce(closeStub);
				sinon.assert.calledOnce(exitStub);
				done();
			});
			process.kill(process.pid, 'SIGTERM');
		});

		it('should handle graceful shutdown when receiving a termination signal (error)', (done) => {
			const server = app.listen(process.env.PORT);
			closeStub = sandbox.stub(server, 'close').callsFake((cb) => {
				cb(new Error());
			});

			process.once('SIGTERM', () => {
				sinon.assert.calledOnce(logInfoStub);
				sinon.assert.calledOnce(logErrorStub);
				sinon.assert.calledOnce(closeStub);
				sinon.assert.calledOnce(exitStub);
				done();
			});
			process.kill(process.pid, 'SIGTERM');
		});
	});
});
