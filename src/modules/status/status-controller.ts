import packageJson from '../../../package.json';

const statusController = (req: any, res: any) => { // TODO: fix any types if possible
	res.status(200).json({
		success: true,
		version: packageJson.version,
		date: new Date().toISOString(),
	});
};

export default statusController;
