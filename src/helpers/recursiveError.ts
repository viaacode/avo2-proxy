/**
 * Centralized error object that contains recursive innerException information
 */
export class RecursiveError extends Object {
	public stack: string[];

	constructor(
			public errorMessage: string,
			public innerException: any = null,
			public additionalInfo: any = null) {
		super();
		if (innerException && typeof innerException.stack === 'string') {
			this.stack = innerException.stack.split('\n');
		} else {
			this.stack = (new Error().stack || '').split('\n');
		}
		// console.error(JSON.stringify(this, null, 2));
	}

	public toString(): string {
		return JSON.stringify(this, null, 2);
	}
}
