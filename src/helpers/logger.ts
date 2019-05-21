// TODO send logs to rabbitMQ from VIAA

export class Logger {
	public static debug(message: string) {
		console.debug(message);
	}

	public static info(message: string) {
		console.info(message);
	}

	public static warn(message: string) {
		console.warn(message);
	}

	public static error(message: string, err: Error) {
		console.error(message, err);
	}

	public static fatal(message: string) {
		console.error(message);
	}
}
