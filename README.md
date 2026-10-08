# markuplint-pretenders-to-jsx-a11y-configs

[![CI on main](https://github.com/mehm8128/markuplint-pretenders-to-jsx-a11y-configs/actions/workflows/main.yml/badge.svg)](https://github.com/mehm8128/markuplint-pretenders-to-jsx-a11y-configs/actions/workflows/main.yml)
[![NPM Version](https://img.shields.io/npm/v/markuplint-pretenders-to-jsx-a11y-configs)](https://www.npmjs.com/package/markuplint-pretenders-to-jsx-a11y-configs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[markuplint](https://markuplint.dev) の Pretenders スキャン結果を、jsx-a11y の `settings["jsx-a11y"].components`(`{ コンポーネント名: "要素名" }`)に変換します。markuplint が検出した「コンポーネント → 実際にレンダリングされる要素」の対応を、次のリンターの jsx-a11y ルールでも使うためのものです。

- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)(ESLint 9 まで)
- [eslint-plugin-jsx-a11y-x](https://github.com/es-tooling/eslint-plugin-jsx-a11y-x)(ESLint 9・10)
- [oxlint](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html#settings-jsx-a11y)(jsx-a11y プラグイン)

どちらも同じ形式の `settings` を受け取ります。

スキャン結果は常に最新である必要があるので、**リンターの設定ファイルの中でスキャンと変換を実行する**使い方を基本とします。リンターが設定を読むたびにスキャンが走り、手動の反映作業は要りません。

## インストール

```sh
pnpm add -D markuplint-pretenders-to-jsx-a11y-configs @markuplint/pretenders
```

`@markuplint/pretenders` は peerDependency です。Node.js 24 以降が必要です。

## 使い方

### ESLint(flat config)

`scanForJsxA11yFlatConfig` は、設定配列にそのまま並べられる `{ settings }` を返します。ESLint 10 に対応した [eslint-plugin-jsx-a11y-x](https://github.com/es-tooling/eslint-plugin-jsx-a11y-x) では `settingsKey: 'jsx-a11y-x'` を指定します(既定は eslint-plugin-jsx-a11y 用の `jsx-a11y`)。トップレベル `await` を使います。

```js
// eslint.config.js
import jsxA11yX from "eslint-plugin-jsx-a11y-x";
import tseslint from "typescript-eslint";

import { scanForJsxA11yFlatConfig } from "markuplint-pretenders-to-jsx-a11y-configs";

export default [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "jsx-a11y-x": jsxA11yX },
    rules: {
      "jsx-a11y-x/anchor-is-valid": "error",
      "jsx-a11y-x/control-has-associated-label": "error",
    },
  },
  await scanForJsxA11yFlatConfig({
    files: ["src/components/**/*.tsx"],
    settingsKey: "jsx-a11y-x",
  }),
];
```

`settingsKey` を省略すれば eslint-plugin-jsx-a11y(ESLint 9 まで)でも使えます。

### oxlint

oxlint の JS/TS 設定ファイルは実験的機能で、Node.js 経由での実行が必要です。

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint";

import { scanForJsxA11y } from "markuplint-pretenders-to-jsx-a11y-configs";

const { settings } = await scanForJsxA11y({
  files: ["src/components/**/*.tsx"],
});

export default defineConfig({
  plugins: ["react", "jsx-a11y"],
  rules: {
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/control-has-associated-label": "error",
  },
  settings,
});
```

```sh
pnpm exec oxlint -c oxlint.config.ts src
```

### `scanForJsxA11y` のオプション

| オプション             | 説明                                               |
| ---------------------- | -------------------------------------------------- |
| `files`                | スキャン対象のglob(`cwd` 基準)                     |
| `cwd`                  | `files` の基準ディレクトリ。既定は `process.cwd()` |
| `ignoreComponentNames` | 結果から除くコンポーネント名                       |

### pretenders.json を変換する

すでに `pretenders.json` がある場合(別パッケージのデザインシステムなど)は、CLI か関数で変換できます。

```sh
pnpm exec pretenders "./src/components/**/*.tsx" --out ./pretenders.json
pnpm exec markuplint-pretenders-to-jsx-a11y ./pretenders.json ./settings.json
```

```ts
import { convertPretendersToJsxA11ySettings } from "markuplint-pretenders-to-jsx-a11y-configs";

const { settings, skipped } = convertPretendersToJsxA11ySettings(
  JSON.parse(json),
);
```

出力された `settings` は、各リンターの設定の `settings` にそのままマージできます。この方法だと `pretenders.json` を再生成しないと古くなるので、CI や lint の前段で再生成してください。

### 変換例

```tsx
export const Link = ({ href, children }) => <a href={href}>{children}</a>;
export const IconButton = ({ label, icon }) => (
  <button type="button" aria-label={label}>
    {icon}
  </button>
);
```

```jsonc
{ "Link": "a", "IconButton": "button" }
```

`<Link href="#" />` が `jsx-a11y/anchor-has-content` などで検出されるようになります。

## API

| 関数                                       | 説明                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `convertPretendersToJsxA11ySettings(file)` | `PretendersFile` を `{ settings, skipped }` に変換する          |
| `scanForJsxA11y(options)`                  | `@markuplint/pretenders` の `scan` で解析し、上の関数で変換する |

`skipped` は変換できなかった `{ selector, reason }` の一覧です。

## 制約

jsx-a11y の `components` は「名前 → 要素名」だけを表せます。

- ルート要素名以外(`slots`、`contents`、`attrs`、`fromAttr` による `aria-label` の props 参照など)は失われます。
- `#fragment`(複数ルートのコンポーネント)は対応する要素がないためスキップされます。
- 同名のコンポーネントが複数ファイルにある場合、最初の1件だけを使い、残りはスキップされます。
- キーにできるのは `Button` や `Ui.Button` のような大文字始まりのコンポーネント名だけです。
- スキャンした対象にページ側のコンポーネント(`App` など)が入ると `App: "main"` のように入るため、`files` にはコンポーネントのディレクトリだけを指定してください。
- `@markuplint/pretenders` のバージョンによって結果が異なります。公開版 5.0.1 では、条件分岐で異なる要素を返す `Heading` が `h1`、複数ルートの `Field` が `label` になることを確認しています(より新しいビルドでは、前者は pretender なし、後者は `#fragment`)。誤検知を避けるため最新版を使ってください。
- `oxlint.config.ts` は oxlint の実験的機能です。
- エディタ(oxlint の言語サーバー)は `oxlint.config.ts` などの設定ファイルが変更されたときだけ設定を再評価します。コンポーネントを変更してもスキャンは再実行されないため、設定ファイルを保存し直すかサーバーを再起動してください。CLI では実行のたびにスキャンされます。
- Biome には `components` に相当するオプションが見つかっていません(公式ドキュメントの設定リファレンスと Linter のページで確認済み。a11y ルールはネイティブ要素名のみが対象)。

## 開発

```sh
mise install
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

`pnpm build` で `dist/` に ESM と型定義を出力します(`prepack` でも実行されます)。開発環境の Node.js は mise.toml で 26.11.1 です。

## ライセンス

MIT
