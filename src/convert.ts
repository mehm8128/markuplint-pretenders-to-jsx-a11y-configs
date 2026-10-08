/** `pretenders.json`(`@markuplint/pretenders`)の1エントリ。このパッケージが読むフィールドのみ。 */
export type Pretender = {
	readonly selector: string;
	readonly as: string | { readonly element: string };
};

export type PretendersFile = {
	readonly data: readonly Pretender[];
};

/**
 * `settings` に書くキー。
 * eslint-plugin-jsx-a11y と oxlint は `jsx-a11y`、eslint-plugin-jsx-a11y-x は `jsx-a11y-x`。
 */
export type SettingsKey = 'jsx-a11y' | 'jsx-a11y-x';

export type ConvertOptions<K extends SettingsKey = 'jsx-a11y'> = {
	/** `settings` のキー。既定は `jsx-a11y`。 */
	readonly settingsKey?: K;
};

/** 各プラグインの `settings[<キー>]` 部分。 */
export type JsxA11ySettings = {
	readonly components: Readonly<Record<string, string>>;
};

export type ConvertResult<K extends SettingsKey = 'jsx-a11y'> = {
	readonly settings: { readonly [P in K]: JsxA11ySettings };
	/** jsx-a11y の `components` で表現できなかったエントリと、その理由。 */
	readonly skipped: readonly { readonly selector: string; readonly reason: string }[];
};

// jsx-a11y は JSX のタグ名で照合するため、キーにできるのは `Button` や `Ui.Button` のような素のコンポーネント名だけ。
const COMPONENT_NAME = /^[A-Z][\w.]*$/;

/**
 * `@markuplint/pretenders` のスキャン結果を、jsx-a11y の
 * `settings["jsx-a11y"].components`(`{ コンポーネント名: "要素名" }`)に変換する。
 * eslint-plugin-jsx-a11y と oxlint の両方で同じ形式を使う。
 *
 * 残るのはルート要素名だけ。`slots`・`contents`・`attrs`・`fromAttr` は
 * jsx-a11y に対応する表現がないため捨てる。
 * 同じセレクターが複数回現れる場合(同名のコンポーネントが複数ファイルにある場合)、
 * jsx-a11y では区別できないため最初の1件を採用し、残りは `skipped` に入れる。
 */
export function convertPretendersToJsxA11ySettings<K extends SettingsKey = 'jsx-a11y'>(
	file: PretendersFile,
	options: ConvertOptions<K> = {},
): ConvertResult<K> {
	const settingsKey = options.settingsKey ?? ('jsx-a11y' as K);
	const components: Record<string, string> = {};
	const skipped: { selector: string; reason: string }[] = [];

	for (const { selector, as } of file.data) {
		const element = typeof as === 'string' ? as : as.element;

		if (element.startsWith('#')) {
			skipped.push({ selector, reason: `"${element}" has no DOM element equivalent` });
			continue;
		}

		if (!COMPONENT_NAME.test(selector)) {
			skipped.push({ selector, reason: 'not a plain component name' });
			continue;
		}

		if (Object.hasOwn(components, selector)) {
			skipped.push({ selector, reason: 'duplicated name; the first definition is used' });
			continue;
		}

		components[selector] = element;
	}

	return { settings: { [settingsKey]: { components } } as ConvertResult<K>['settings'], skipped };
}
