import type { Avo } from '@viaa/avo2-types';

import InteractiveTourService from './service';

export default class InteractiveTourController {
	public static async getInteractiveTourRouteIds(): Promise<string[]> {
		return InteractiveTourService.getInteractiveTourRouteIds();
	}

	public static async getInteractiveTour(routeId: string, profileId: string | undefined): Promise<Avo.InteractiveTour.InteractiveTour | null> {
		return InteractiveTourService.getInteractiveTour(routeId, profileId);
	}
}
