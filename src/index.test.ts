import assert from 'node:assert/strict';
import { test } from 'node:test';

import { convertPretendersToJsxA11ySettings } from './convert.ts';

test('maps string and object forms of `as` to element names', () => {
	const { settings, skipped } = convertPretendersToJsxA11ySettings({
		data: [
			{ selector: 'Link', as: { element: 'a' } },
			{ selector: 'Item', as: 'li' },
		],
	});
	assert.deepEqual(settings['jsx-a11y'].components, { Link: 'a', Item: 'li' });
	assert.deepEqual(skipped, []);
});

test('skips fragments, non-component selectors and duplicates', () => {
	const { settings, skipped } = convertPretendersToJsxA11ySettings({
		data: [
			{ selector: 'Field', as: { element: '#fragment' } },
			{ selector: 'my-element', as: 'div' },
			{ selector: 'Item', as: 'li' },
			{ selector: 'Item', as: 'div' },
		],
	});
	assert.deepEqual(settings['jsx-a11y'].components, { Item: 'li' });
	assert.deepEqual(
		skipped.map(s => s.selector),
		['Field', 'my-element', 'Item'],
	);
});
