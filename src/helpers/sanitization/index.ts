import sanitizeHtml from 'sanitize-html';

import presets from './presets';

const sanitize = (input: string, preset = presets.basic) => sanitizeHtml(input, {
	...preset,
});

export {
	sanitize,
	presets,
};
