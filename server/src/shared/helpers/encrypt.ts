// Nodejs encryption with CTR
import crypto from 'crypto';
const algorithm = 'aes-256-cbc';

// Ideally generated once per day and stays the same after server restarts / across multiple servers
const key = 'Aj_b*-@Wx6-BTdPjbyQNjURa8Wk5Lmr+';
const iv = 'pfu!V!hEzq!RL^dG';

export function encrypt(text: string): string {
	const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return encrypted.toString('hex');
}

export function decrypt(text: string): string {
	const encryptedText = Buffer.from(text, 'hex');
	const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}
