// 第三者のライセンス表示を配信物に含める（docs/04-security-design.md 2.3.1、docs/07 の S12）
// - 実行時の依存（package-lock.json で dev でないもの）の LICENSE などの原文を、そのままコピーする
// - Tailwind CSS は開発時の依存だが、生成した CSS に Preflight などが含まれるので、別枠で原文を含める
// - 一覧は /snap-redact/third-party-licenses/ の index.html。ファイルは .txt にして、ブラウザで表示できるようにする
// 原文のコピーは表示義務を満たすためのもので、それだけで法的な適合を保証するものではない
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LICENSE_DIR = join('snap-redact', 'third-party-licenses');
const LICENSE_FILE = /^(?:licen[cs]e|copying|notice)(?:[.\-_].*)?$/i;
const PACKAGE_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i;
const VERSION = /^[0-9A-Za-z.+_-]+$/;

/** @param {string} s */
const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * @param {string} root リポジトリのルート（package-lock.json と node_modules がある場所）
 * @param {string} dist 出力先（dist）
 * @returns {{ name: string; version: string; license: string; kind: string; files: string[] }[]}
 */
export function copyLicenses(root, dist) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  /** @type {[string, { version?: string; license?: string; dev?: boolean }][]} */
  const entries = Object.entries(lock.packages ?? {});
  const runtime = entries
    .filter(([path, meta]) => path.startsWith('node_modules/') && meta.dev !== true)
    .map(([path, meta]) => ({ path, meta, kind: '実行時の依存' }));
  const tailwind = entries.find(([path]) => path === 'node_modules/tailwindcss');
  if (!tailwind) throw new Error('package-lock.json に tailwindcss がありません');
  const targets = [
    ...runtime,
    { path: tailwind[0], meta: tailwind[1], kind: '生成した CSS に含まれるコード（開発時の依存）' },
  ].sort((a, b) => a.path.localeCompare(b.path));
  if (runtime.length === 0) throw new Error('実行時の依存が見つかりません');

  const out = join(dist, LICENSE_DIR);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const result = [];
  for (const { path, meta, kind } of targets) {
    const name = path.slice('node_modules/'.length);
    const version = meta.version ?? '';
    // lockfile の値を出力先のパスに使うので、形を確かめてから使う
    if (!PACKAGE_NAME.test(name)) throw new Error(`想定外のパッケージ名: ${name}`);
    if (!VERSION.test(version)) throw new Error(`想定外のバージョン: ${name} ${version}`);
    const dir = join(root, path);
    const originals = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && LICENSE_FILE.test(e.name))
      .map((e) => e.name)
      .sort();
    if (originals.length === 0) throw new Error(`${path} に LICENSE などの原文がありません`);
    const files = originals.map((file) => {
      const target = `${name.replaceAll('/', '__')}-${version}-${file}.txt`;
      copyFileSync(join(dir, file), join(out, target));
      return target;
    });
    result.push({ name, version, license: meta.license ?? 'UNKNOWN', kind, files });
  }

  const items = result
    .map(
      (p) =>
        `      <li>${escapeHtml(`${p.name}@${p.version}`)}（${escapeHtml(p.license)}、${escapeHtml(p.kind)}）：` +
        p.files.map((f) => `<a href="./${escapeHtml(f)}">${escapeHtml(f)}</a>`).join('、') +
        '</li>',
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <title>OSSライセンス | Snap-Redact | CircleNote</title>
  </head>
  <body>
    <h1>OSSライセンス</h1>
    <p>Snap-Redact の配信物に含まれる第三者のソフトウェアと、そのライセンスの原文です。原文はパッケージに含まれるファイルをそのままコピーしています。</p>
    <ul>
${items}
    </ul>
    <p><a href="../">Snap-Redact に戻る</a></p>
  </body>
</html>
`;
  writeFileSync(join(out, 'index.html'), html, 'utf8');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const copied = copyLicenses(root, join(root, 'dist'));
  console.log(
    `copied licenses: ${copied.map((p) => `${p.name}@${p.version}`).join(', ')} -> dist/${LICENSE_DIR}/`,
  );
}
