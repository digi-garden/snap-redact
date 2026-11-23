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
