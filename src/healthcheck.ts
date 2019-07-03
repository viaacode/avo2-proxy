import http from 'http';

const options = {
	host: 'localhost',
	port: process.env.PORT,
	path: '/status',
	timeout: 2000,
};

const request = http.request(options, (res: http.IncomingMessage) => {
	console.log('STATUS:', res.statusCode); // eslint-disable-line no-console
	process.exitCode = (res.statusCode === 200) ? 0 : 1;
	process.exit();
});

request.on('error', (err) => {
	console.error('ERROR:', err); // eslint-disable-line no-console
	process.exit(1);
});

request.end();
