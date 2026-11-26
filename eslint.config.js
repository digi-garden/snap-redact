// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------
// 柱A：画像を外に出さないための禁止ルール（docs/04-security-design.md 3章）
// ESLint は「うっかり書くこと」を止める柵。送信を確実に止める壁は CSP（04 の 2章）。
// ---------------------------------------------------------------------------
const NET = '外部通信は禁止（柱A、04 の 3.1）';
const STORE = '画像を保存しない（T4、04 の 3.1）';
const NAV = 'ページ遷移による送信を防ぐ（T8、04 の 3.1）';

/** @type {Array<[string, string]>} */
const bannedGlobals = [
  ['fetch', NET],
  ['XMLHttpRequest', NET],
  ['WebSocket', NET],
  ['EventSource', NET],
  ['localStorage', STORE],
  ['sessionStorage', STORE],
  ['indexedDB', STORE],
  ['caches', STORE],
  ['cookieStore', STORE],
  ['location', NAV],
  ['open', NAV],
  ['navigation', NAV],
];

// 同じ名前を window. / self. / globalThis. / document. 経由で参照することも禁止する
const globalObjects = ['window', 'self', 'globalThis', 'document'];

// no-restricted-syntax は1つのルールなので、ここに1つの配列としてまとめる（04 の 3.1）
const restrictedSyntax = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'HTML の直接挿入は禁止（04 の 3.2）',
  },
  {
    selector:
      "MemberExpression[computed=true][property.type='Literal'][property.value=/^(fetch|open|location|navigation|sendBeacon|serviceWorker|localStorage|sessionStorage|indexedDB|caches|cookie|cookieStore|XMLHttpRequest|WebSocket|EventSource)$/]",
    message: '文字列による参照で禁止ルールを回避しない（04 の 3.3）',
  },
  {
    selector: "JSXAttribute[name.name='href'] > JSXExpressionContainer",
    message: 'リンク先は固定の文字列だけ（T8、04 の 3.3）',
  },
];

// ---------------------------------------------------------------------------
// レイヤーの依存ルール（docs/03-architecture.md 4章）
// import の文字列はファイルの解決後のパスではないため、'../canvas/x' のような相対パスや
// 'react/jsx-runtime' のようなサブパスも捕まえられるよう、パスの区切り（/）単位の正規表現で判定する。
// ---------------------------------------------------------------------------
const REACT = '^react(-dom)?(/|$)';
/** @param {string[]} layers */
const segment = (layers) => `(^|/)(${layers.join('|')})(/|$)`;

/**
 * @param {string[]} regexes
 * @param {string} message
 * @returns {import('eslint').Linter.RulesRecord}
 */
const forbidImports = (regexes, message) => ({
  'no-restricted-imports': ['error', { patterns: regexes.map((regex) => ({ regex, message })) }],
});

/**
 * レイヤーごとの依存ルール。scripts/eslint-rules.test.mjs からも使う。
 * @type {import('eslint').Linter.Config[]}
 */
export const layerConfigs = [
  {
    files: ['src/lib/core/**/*.{ts,tsx}'],
    rules: forbidImports(
      [REACT, segment(['canvas', 'browser', 'hooks', 'components'])],
      'lib/core は React・DOM・ほかのレイヤーに依存しない（03 の 4章）',
    ),
  },
  {
    files: ['src/lib/canvas/**/*.{ts,tsx}'],
    rules: forbidImports(
      [REACT, segment(['browser', 'hooks', 'components'])],
      'lib/canvas は lib/core と Canvas API だけに依存する（03 の 4章）',
    ),
  },
  {
    files: ['src/lib/browser/**/*.{ts,tsx}'],
    rules: forbidImports(
      [REACT, segment(['canvas', 'hooks', 'components'])],
      'lib/browser は lib/core とブラウザ API だけに依存する（03 の 4章）',
    ),
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: forbidImports(
      [segment(['components'])],
      'hooks は components に依存しない（03 の 4章）',
    ),
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: forbidImports(
      [segment(['canvas', 'browser'])],
      'components から lib/canvas・lib/browser を直接呼ばない。hooks を通す（03 の 4章）',
    ),
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/**',
      'playwright-report/**',
      'test-results/**',
      // 禁止ルールのテスト用ファイル（scripts/eslint-rules.test.mjs が ignore を無効にして検査する）
      'src/test/eslint-forbidden/**',
    ],
  },

  // 共通
  js.configs.recommended,

  // 設定ファイル・ビルド用スクリプト（Node で動く。ブラウザには届かない）
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,ts}', 'e2e/**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // アプリのソース
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-restricted-globals': [
        'error',
        ...bannedGlobals.map(([name, message]) => ({ name, message })),
      ],
      'no-restricted-properties': [
        'error',
        ...globalObjects.flatMap((object) =>
          bannedGlobals.map(([property, message]) => ({ object, property, message })),
        ),
        // どのオブジェクト経由でも禁止する（window.navigator.sendBeacon なども捕まえる）
        { property: 'sendBeacon', message: NET },
        { property: 'serviceWorker', message: 'Service Worker は使わない' },
        // Cookie への保存は CSP では止められない（T4）
        { property: 'cookie', message: STORE },
      ],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // 名前付き export に統一する（03 の 6.2）
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },

  // テスト：モック関数（vi.fn）をオブジェクトから取り出して検証するため、unbound-method は使わない
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },

  // レイヤーごとの依存ルール
  ...layerConfigs,
);
