import PlayerTokenService, { PlayerTokenResponse } from './service';

export default class PlayerTokenController {

	public static async getToken(mediaUrl: string, ip: string, userAgent: string, expire: number): Promise<PlayerTokenResponse> {
		return PlayerTokenService.getToken(mediaUrl, ip, userAgent, expire);
	}
}
