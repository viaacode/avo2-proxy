import { decrypt, encrypt } from './encrypt';

describe('[UNIT - SHARED] Encrypt', () => {

	it('Should encrypt and decrypt a message', (done: jest.DoneCallback) => {
		const message = 'this is secret text';
		const encryptedMessage = encrypt(message);
		expect(encryptedMessage).toBeDefined();
		expect(encryptedMessage).toBeString();
		expect(encryptedMessage.length).toBeGreaterThan(5);
		const decryptedMessage = decrypt(encryptedMessage);
		expect(decryptedMessage).toBeDefined();
		expect(decryptedMessage).toBeString();
		expect(decryptedMessage).toEqual(message);

		done();
	});
});
