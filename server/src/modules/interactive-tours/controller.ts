import InteractiveTourService from './service';
import { InteractiveTour } from './route';

export default class InteractiveTourController {
	public static async getInteractiveTourRouteIds(): Promise<string[]> {
		return InteractiveTourService.getInteractiveTourRouteIds();
	}

	public static async getInteractiveTour(routeId: string, profileId: string | undefined): Promise<InteractiveTour | null> {
		return InteractiveTourService.getInteractiveTour(routeId, profileId);
	}
}
