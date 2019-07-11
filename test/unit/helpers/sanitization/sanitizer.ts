import { presets, sanitize } from '../../../../src/helpers/sanitization';

describe('Sanitizer helper', () => {
	it('Should remove all unallowed tags when using the `basic` preset', () => {
		const input = '<hmtl><p>Hello! <a href="https://www.test.com">www.test.com</a></p>  <span>testing</span> <ul><li>item</li></ul></html>';
		const expectedOutput = '<p>Hello! www.test.com</p>  testing <ul><li>item</li></ul>';

		const output = sanitize(input, presets.basic);

		expect(output).toEqual(expectedOutput);
	});

	it('Should  remove all unallowed tags and attributes when using the `link` preset', () => {
		const input = '<hmtl><p>Hello! <a href="https://www.test.com" rel="noreferrer">www.test.com</a></p>  <span>testing</span> <ul><li>item</li></ul></html>';
		const expectedOutput = '<p>Hello! <a href="https://www.test.com">www.test.com</a></p>  testing <ul><li>item</li></ul>';

		const output = sanitize(input, presets.links);

		expect(output).toEqual(expectedOutput);
	});
});
