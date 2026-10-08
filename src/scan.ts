import fs from 'node:fs';
import path from 'node:path';

import { scan } from '@markuplint/pretenders';

import { convertPretendersToJsxA11ySettings } from './convert.ts';
import type { ConvertOptions, ConvertResult, SettingsKey } from './convert.ts';

export type ScanForJsxA11yOptions<K extends SettingsKey = 'jsx-a11y'> = ConvertOptions<K> & {
	/** スキャン対象のコンポーネントファイルのglob(`cwd` 基準)。 */
	readonly files: readonly string[];
	/** `files` の基準ディレクトリ。既定は `process.cwd()`。 */
	readonly cwd?: string;
	/** 結果から除外するコンポーネント名。 */
	readonly ignoreComponentNames?: readonly string[];
};

/**
 * markuplint の pretenders スキャンと変換をまとめて実行する。
 *
 * `oxlint.config.ts` や `eslint.config.js` から呼ぶと、リンターが設定を読むたびにスキャンが走る。
 * 古い `pretenders.json` を手で変換し直す必要がなくなる。
 */
export async function scanForJsxA11y<K extends SettingsKey = 'jsx-a11y'>(
	options: ScanForJsxA11yOptions<K>,
): Promise<ConvertResult<K>> {
	const cwd = options.cwd ?? process.cwd();
	const files = fs
		.globSync([...options.files], { cwd })
		.map(file => path.resolve(cwd, file))
		.toSorted();

	const pretenders = await scan(files, { ignoreComponentNames: options.ignoreComponentNames });
	return convertPretendersToJsxA11ySettings({ data: pretenders }, { settingsKey: options.settingsKey });
}

/**
 * ESLint の flat config にそのまま並べられる設定オブジェクトを返す。
 * `files` を持たないので、設定配列のどこに置いても全ファイルの `settings` に反映される。
 *
 * @example
 * export default [jsxA11yX.configs.recommended, await scanForJsxA11yFlatConfig({ files: [...], settingsKey: 'jsx-a11y-x' })];
 */
export async function scanForJsxA11yFlatConfig<K extends SettingsKey = 'jsx-a11y'>(
	options: ScanForJsxA11yOptions<K>,
): Promise<{ readonly name: string; readonly settings: ConvertResult<K>['settings'] }> {
	const { settings } = await scanForJsxA11y(options);
	return { name: 'markuplint-pretenders/jsx-a11y-settings', settings };
}
