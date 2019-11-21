/**
 * Returns the first part of a url without the path
 * eg: http://google.com/search?q=test => http://google.com
 * @param url
 */
export function getHost(url: string): string {
	return url.replace(/([^/]*\/\/[^/]+)\/.*/, '$1');
}
