import { IInternalServerError, IInternalServerErrorDetail } from '../../src/shared/shared.types';
import { default as config } from '../../src/config';

export const validateError = <T>(err: IInternalServerError, type: T, statusCode: number, name: string, message: string, details?: IInternalServerErrorDetail[]): void => {
	expect(err).toBeDefined();
	expect(err).toBeInstanceOf(type);
	expect(err.host).toEqual(config.server.host);
	expect(err.identifier).toBeString();
	expect(err.message).toEqual(message);
	expect(err.name).toEqual(name);
	expect(err.stack).toBeString();
	expect(err.statusCode).toEqual(statusCode);
	expect(err.timestamp).toBeString();

	if (details) {
		expect(err.details).toEqual(details);
	} else {
		expect(err.details).toBeUndefined();
	}
};

export const validateErrorBody = (
	body: any, // tslint:disable-line no-any
	statusCode: number,
	name: string,
	message: string,
	details?: IInternalServerErrorDetail[]
): void => {
	expect(body).toBeObject();
	expect(body).toContainKeys([
		'host',
		'identifier',
		'timestamp',
		'status',
		'name',
		'message',
		'stack',
	]);
	expect(body.host).toEqual(config.server.host);
	expect(body.identifier).toBeString();
	expect(body.timestamp).toBeString();
	expect(body.statusCode).toEqual(statusCode);
	expect(body.name).toEqual(name);
	expect(body.message).toEqual(message);
	expect(body.stack).toBeString();

	if (details) {
		expect(body).toContainKey('details');
		expect(body.details).toEqual(details);
	} else {
		expect(body.details).toBeUndefined();
	}
};
