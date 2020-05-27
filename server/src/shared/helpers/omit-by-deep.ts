import _ from 'lodash';

export function omitByDeep(obj: any, predicate: (key: string | number, value: any) => boolean): any {
	const returnObj: any = _.isArray(obj) ? [] : {};
	_.forIn(obj, (value: any, key: string | number) => {
		if (!predicate(key, value)) {
			if (_.isPlainObject(value)) {
				// Recursively omit inner object properties
				returnObj[key] = omitByDeep(value, predicate);
			} else {
				returnObj[key] = value;
			}
		}
		// else if predicate is true => we do not need to copy the property to the returnObj
	});
	return returnObj;
}
