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

	it('should return stills for the requested items', async () => {
		const response = await api
			.get('/video-stills')
			.query({
				externalIds: externalIds.join(','),
			});
		expect(response.body).toBeArray();
		expect(response.body[0]).toBeDefined();
		expect(response.body[0]).toContainAllKeys(['absoluteTimecode', 'relativeTimecode', 'previewImagePath', 'thumbnailImagePath']);
	});
});
