/**
 * Converts a duration string to milliseconds
 * 00:03:36.045 => 216045
 *
 * @param duration
 * @param silent if this function should throw an error or instead return null if the format of the duration is invalid
 */
export function toMilliseconds(
	duration: number | string | undefined | null,
	silent: boolean = false
): number | null {
	if (!duration) {
		return 0;
	}
	if (typeof duration === 'number') {
		return duration;
	}

	const durationParts = duration.split(':');
	try {
		if (durationParts.length !== 3) {
			throw new Error(
				`Kon het tijdsinterval niet analyseren: "${duration}". Verwacht formaat: uu:mm:ss.lll`
			);
		}
		return Math.round((
			parseInt(durationParts[0], 10) * 3600 +
			parseInt(durationParts[1], 10) * 60 +
			parseFloat(durationParts[2])
		) * 1000);
	} catch (err) {
		if (silent) {
			return null;
		}
		throw new Error(
			`Kon het tijdsinterval niet analyseren: "${duration}". Verwacht formaat: uu:mm:ss.lll`
		);
	}
}
