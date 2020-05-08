import packageJson from '../../../package.json';

import { IStatusResponse } from './types';

export default class StatusController {

	public static status(): IStatusResponse {
		return {
			success: true,
			version: packageJson.version,
			date: new Date().toISOString(),
		};
	}

}
