#!/usr/bin/env node
import fs from 'node:fs';

import { convertPretendersToJsxA11ySettings } from './convert.ts';
import type { PretendersFile } from './convert.ts';

const [input, output] = process.argv.slice(2);

if (!input || !output) {
	console.error('Usage: markuplint-pretenders-to-jsx-a11y <pretenders.json> <settings.json>');
	process.exit(1);
}

const file = JSON.parse(fs.readFileSync(input, 'utf8')) as PretendersFile;
const { settings, skipped } = convertPretendersToJsxA11ySettings(file);

fs.writeFileSync(output, JSON.stringify({ settings }, null, 2) + '\n');

for (const { selector, reason } of skipped) {
	console.warn(`skipped ${selector}: ${reason}`);
}
