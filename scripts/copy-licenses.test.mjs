// 第三者のライセンス表示のコピー（scripts/copy-licenses.mjs）
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyLicenses, LICENSE_DIR } from './copy-licenses.mjs';

/** @type {string} */
let root = '';

/**
 * package-lock.json と node_modules の小さな見本を作る
 * @param {{ name: string; version: string; dev?: boolean; files?: string[] }[]} packages
 */
function setup(packages) {
  /** @type {{ packages: Record<string, object> }} */
  const lock = { packages: { '': {} } };
  for (const p of packages) {
    lock.packages[`node_modules/${p.name}`] = { version: p.version, license: 'MIT', dev: p.dev };
    const dir = join(root, 'node_modules', p.name);
    mkdirSync(dir, { recursive: true });
    for (const f of p.files ?? ['LICENSE']) writeFileSync(join(dir, f), `${p.name} license text`);
  }
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify(lock));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'licenses-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('copyLicenses', () => {
  it('実行時の依存と tailwindcss の原文を .txt でコピーし、一覧の HTML を作る（開発時の依存は含めない）', () => {
    setup([
      { name: 'react', version: '19.3.1' },
      { name: 'tailwindcss', version: '4.3.5', dev: true },
      { name: 'vitest', version: '5.1.1', dev: true },
    ]);
    const result = copyLicenses(root, join(root, 'dist'));
    expect(result.map((p) => p.name)).toEqual(['react', 'tailwindcss']);
    const out = join(root, 'dist', LICENSE_DIR);
    expect(readdirSync(out).sort()).toEqual([
      'index.html',
      'react-19.3.1-LICENSE.txt',
      'tailwindcss-4.3.5-LICENSE.txt',
    ]);
    expect(readFileSync(join(out, 'react-19.3.1-LICENSE.txt'), 'utf8')).toBe('react license text');
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    expect(html).toContain('react@19.3.1');
    expect(html).toContain('href="./tailwindcss-4.3.5-LICENSE.txt"');
    expect(html).not.toMatch(/<script|<style|https?:\/\//);
  });

  it('原文のないパッケージがあれば失敗する（表示の漏れに気づけるように）', () => {
    setup([
      { name: 'react', version: '19.3.1', files: ['README.md'] },
      { name: 'tailwindcss', version: '4.3.5', dev: true },
    ]);
    expect(() => copyLicenses(root, join(root, 'dist'))).toThrow(/原文がありません/);
  });

  it('lockfile のパッケージ名が想定外の形なら失敗する（出力先のパスに使うため）', () => {
    setup([{ name: 'tailwindcss', version: '4.3.5', dev: true }]);
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/../evil'] = { version: '1.0.0', license: 'MIT' };
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify(lock));
    expect(() => copyLicenses(root, join(root, 'dist'))).toThrow(/想定外のパッケージ名/);
  });
});
