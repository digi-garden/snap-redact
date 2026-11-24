// @vitest-environment node
// ESLint の禁止ルールのテスト（docs/06-test-design.md 2.3）
// src/test/eslint-forbidden/ のファイルを実際の eslint.config.js で検査し、
// 「expect:」を書いた行で、そのルールのエラーが出ることを確かめる。
// ルールの設定を誤って消したり、書き方の抜けが生じたりしたときに気づけるようにする。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const fixtureDir = join(root, 'src', 'test', 'eslint-forbidden');
const fixtures = ['forbidden.ts', 'forbidden-jsx.tsx'];
const FORBIDDEN_RULES = new Set([
  'no-restricted-globals',
  'no-restricted-properties',
  'no-restricted-syntax',
  'no-eval',
  'no-new-func',
]);

/**
 * @param {string} text
 * @returns {Map<number, string>} 行番号 → 期待するルール
 */
function expectations(text) {
  const map = new Map();
  text.split('\n').forEach((line, i) => {
    const m = /expect:\s*([a-z-]+)/.exec(line);
    if (m && !line.trimStart().startsWith('//')) map.set(i + 1, m[1]);
  });
  return map;
}

describe('ESLint の禁止ルール', async () => {
  // テスト用ファイルは通常の lint から外しているので、ignore を無効にして検査する
  const eslint = new ESLint({ cwd: root, ignore: false });
  const results = await eslint.lintFiles(fixtures.map((f) => join(fixtureDir, f)));

  for (const result of results) {
    const name = result.filePath.split(/[\\/]/).at(-1);
    const expected = expectations(readFileSync(result.filePath, 'utf8'));

    describe(String(name), () => {
      it('解析エラーがない', () => {
        expect(result.messages.filter((m) => m.fatal)).toEqual([]);
      });

      for (const [line, rule] of expected) {
        it(`${line} 行目で ${rule} が出る`, () => {
          const hits = result.messages.filter((m) => m.line === line).map((m) => m.ruleId);
          expect(hits).toContain(rule);
        });
      }

      it('expect のない行では禁止ルールが出ない（許可した書き方を誤って止めない）', () => {
        const unexpected = result.messages.filter(
          (m) => m.ruleId !== null && FORBIDDEN_RULES.has(m.ruleId) && !expected.has(m.line),
        );
        expect(unexpected.map((m) => `${m.line}: ${m.ruleId}`)).toEqual([]);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// レイヤーの依存ルール（docs/03-architecture.md 4章）
// ファイルの置き場所で効くルールなので、実在しないパスを filePath に指定して lintText で確かめる。
// 型情報が要らないよう、依存ルールだけを読み込んだ ESLint を使う。
// ---------------------------------------------------------------------------
describe('レイヤーの依存ルール', async () => {
  const { layerConfigs } = await import('../eslint.config.js');
  const { default: tseslint } = await import('typescript-eslint');
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
      ...layerConfigs,
    ],
  });

  /**
   * @param {string} file src からの相対パス
   * @param {string} specifier import する文字列
   */
  async function isBlocked(file, specifier) {
    const [result] = await eslint.lintText(`import '${specifier}';\n`, {
      filePath: join(root, 'src', file),
    });
    return (result?.messages ?? []).some((m) => m.ruleId === 'no-restricted-imports');
  }

  /** @type {Array<[string, string, boolean]>} [ファイル, import, 止めるか] */
  const cases = [
    // lib/core：React・ほかのレイヤーを禁止
    ['lib/core/a.ts', 'react', true],
    ['lib/core/a.ts', 'react/jsx-runtime', true],
    ['lib/core/a.ts', 'react-dom/client', true],
    ['lib/core/a.ts', '../canvas/applyOp', true],
    ['lib/core/a.ts', '../browser/pickImage', true],
    ['lib/core/a.ts', '../../hooks/useToast', true],
    ['lib/core/a.ts', '../../components/Toast', true],
    ['lib/core/a.tsx', '../canvas/applyOp', true],
    ['lib/core/a.ts', './geometry', false],
    ['lib/core/a.ts', './types', false],
    // lib/canvas：browser・hooks・components・React を禁止、core は可
    ['lib/canvas/a.ts', '../browser/copyImage', true],
    ['lib/canvas/a.ts', 'react', true],
    ['lib/canvas/a.ts', '../core/types', false],
    ['lib/canvas/a.ts', './applyOp', false],
    // lib/browser：canvas・hooks・components・React を禁止、core は可
    ['lib/browser/a.ts', '../canvas/prepareCanvas', true],
    ['lib/browser/a.ts', '../../hooks/useToast', true],
    ['lib/browser/a.ts', '../core/limits', false],
    // hooks：components を禁止、lib は可
    ['hooks/a.ts', '../components/Toast', true],
    ['hooks/a.ts', '../lib/canvas/applyOp', false],
    ['hooks/a.ts', '../lib/browser/copyImage', false],
    ['hooks/a.ts', 'react', false],
    // components：lib/canvas・lib/browser を禁止、hooks・lib/core は可
    ['components/A.tsx', '../lib/canvas/applyOp', true],
    ['components/A.tsx', '../lib/browser/copyImage', true],
    ['components/a.ts', '../lib/browser/copyImage', true],
    ['components/A.tsx', '../hooks/useToast', false],
    ['components/A.tsx', '../lib/core/types', false],
    ['components/A.tsx', './CanvasStage', false],
    ['components/A.tsx', 'react', false],
  ];

  for (const [file, specifier, blocked] of cases) {
    it(`${file} で '${specifier}' を${blocked ? '止める' : '止めない'}`, async () => {
      expect(await isBlocked(file, specifier)).toBe(blocked);
    });
  }
});
