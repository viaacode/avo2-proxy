import 'jest';
import supertest from 'supertest';
import { App } from '@app';

const api = supertest(new App(false).app);

const externalIds = ['0k2698w029', '2f7jq1gs22', 's756d6b44p', 'sj19k4vw4f'];

describe('Video stills', () => {
	it('should throw an error if no externalIds are passed', async () => {
		const response = await api
			.get('/video-stills');
		expect(response.text).toContain('query param externalIds is required');
	});

	it('should return stills for the requested items in order', async () => {
		const response = await api
			.get('/video-stills')
			.query({
				externalIds: externalIds.join(','),
			});
		expect(response.body).toBeArray();
		expect(response.body).toHaveLength(20);
		expect(response.body[0]).toBeDefined();
		expect(response.body[0]).toContainAllKeys(['absoluteTimecode', 'relativeTimecode', 'previewImagePath', 'thumbnailImagePath']);
		expect(response.body[0].thumbnailImagePath).toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
		expect(response.body[1].thumbnailImagePath).toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
	});

	it('should return all stills', async () => {
		const response = await api
			.get('/video-stills')
			.query({
				externalIds: externalIds.join(','),
				numberOfStills: 0,
			});
		expect(response.body).toBeArray();
		expect(response.body.length).toBeGreaterThan(20);
	});

	it('should return stills if number of stills is less than number of videos', async () => {
		const response = await api
			.get('/video-stills')
			.query({
				externalIds: externalIds.join(','),
				numberOfStills: 2,
			});
		expect(response.body).toBeArray();
		expect(response.body).toHaveLength(2);
		expect(response.body[0].thumbnailImagePath).toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
		expect(response.body[1].thumbnailImagePath).not.toContain('82694db09788419a926cb278c83d6059039243c8db8743a1b083f0cc34245661');
	});
});
