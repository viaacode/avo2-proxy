import 'jest';
import supertest from 'supertest';
import { App } from '../../app';
import { StillRequest } from './validation';

const api = supertest(new App(false).app);

const stillRequests: StillRequest[] = [
	{ externalId: '0k2698w029', startTime: 0 },
	{ externalId: '2f7jq1gs22', startTime: 0 },
	{ externalId: 's756d6b44p', startTime: 0 },
	{ externalId: 'sj19k4vw4f', startTime: 0 },
];

describe('Video stills', () => {
	it('should throw an error if no still requests are passed', async () => {
		const response = await api
			.post('/video-stills');
		expect(response.text).toContain('No still requests were passed to the video-stills route');
	});

	it('should throw an error if the wrong still requests format is passed', async () => {
		const response = await api
			.post('/video-stills').send([{ incorrectFormat: 'externalId', startTime: 5 }]);
		expect(response.text).toContain('The still requests array doesn&#39;t have the expected format');
	});

	it('should return stills for the requested items', async () => {
		const response = await api
			.post('/video-stills')
			.send(stillRequests);
		expect(response.body).toBeArray();
		expect(response.body).toHaveLength(stillRequests.length);
		expect(response.body[0]).toBeDefined();
		expect(response.body[0]).toContainAllKeys(['previewImagePath', 'thumbnailImagePath']);
		expect(response.body[0].thumbnailImagePath).toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
		expect(response.body[1].thumbnailImagePath).not.toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
	});

	it('should return different stills if starttime is different', async () => {
		const response = await api
			.post('/video-stills')
			.send(stillRequests.map((still: StillRequest) => ({ externalId: still.externalId, startTime: 60000 })));
		expect(response.body).toBeArray();
		expect(response.body[0].previewImagePath).toContain('keyframe7.jpg');
	});
});
