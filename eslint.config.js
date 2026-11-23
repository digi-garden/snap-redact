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
  ['location', NAV],
  ['open', NAV],
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
      "MemberExpression[computed=true][property.type='Literal'][property.value=/^(fetch|open|location|sendBeacon|localStorage|sessionStorage|indexedDB|caches|XMLHttpRequest|WebSocket|EventSource)$/]",
    message: '文字列による参照で禁止ルールを回避しない（04 の 3.3）',
  },
  {
    selector: "JSXAttribute[name.name='href'] > JSXExpressionContainer",
    message: 'リンク先は固定の文字列だけ（T8、04 の 3.3）',
  },
];

// ---------------------------------------------------------------------------
// レイヤーの依存ルール（docs/03-architecture.md 4章）
// ---------------------------------------------------------------------------
/**
 * @param {string[]} groups
 * @param {string} message
 * @returns {import('eslint').Linter.RulesRecord}
 */
const forbidImports = (groups, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: groups, message }] }],
});

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/**',
      // 禁止ルールのテスト用ファイル（scripts/eslint-rules.test.mjs が ignore を無効にして検査する）
      'src/test/eslint-forbidden/**',
    ],
  },

  // 共通
  js.configs.recommended,

  // 設定ファイル・ビルド用スクリプト（Node で動く。ブラウザには届かない）
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
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
        { object: 'navigator', property: 'sendBeacon', message: NET },
        { object: 'navigator', property: 'serviceWorker', message: 'Service Worker は使わない' },
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

  // レイヤーごとの依存ルール
  {
    files: ['src/lib/core/**/*.ts'],
    rules: forbidImports(
      [
        'react',
        'react-dom',
        '**/lib/canvas/**',
        '**/lib/browser/**',
        '**/hooks/**',
        '**/components/**',
      ],
      'lib/core は React・DOM・ほかのレイヤーに依存しない（03 の 4章）',
    ),
  },
  {
    files: ['src/lib/canvas/**/*.ts'],
    rules: forbidImports(
      ['react', 'react-dom', '**/lib/browser/**', '**/hooks/**', '**/components/**'],
      'lib/canvas は lib/core と Canvas API だけに依存する（03 の 4章）',
    ),
  },
  {
    files: ['src/lib/browser/**/*.ts'],
    rules: forbidImports(
      ['react', 'react-dom', '**/lib/canvas/**', '**/hooks/**', '**/components/**'],
      'lib/browser は lib/core とブラウザ API だけに依存する（03 の 4章）',
    ),
  },
  {
    files: ['src/hooks/**/*.ts'],
    rules: forbidImports(['**/components/**'], 'hooks は components に依存しない（03 の 4章）'),
  },
  {
    files: ['src/components/**/*.tsx'],
    rules: forbidImports(
      ['**/lib/canvas/**', '**/lib/browser/**'],
      'components から lib/canvas・lib/browser を直接呼ばない。hooks を通す（03 の 4章）',
    ),
  },
);
