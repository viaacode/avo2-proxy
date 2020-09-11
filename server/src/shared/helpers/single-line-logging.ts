export function jsonStringify(obj: any) {
	if (process.env.SINGLE_LINE_LOGGING === 'true') {
		return JSON.stringify(obj);
	}
	return JSON.stringify(obj, null, 2);
}
