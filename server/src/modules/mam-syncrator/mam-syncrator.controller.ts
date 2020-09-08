import MamSyncratorService from './mam-syncrator.service';

export default class MamSyncratorController {
	public static async triggerDeltaSync(): Promise<string | null> {
		return MamSyncratorService.triggerDeltaSync();
	}
}
