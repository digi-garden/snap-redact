// ビルド成果物の検査（docs/04-security-design.md 4章）
// 依存ライブラリを含めた最終成果物を見て、次のどれかに当てはまれば失敗させる。
//   1. dist/_headers がない、または /snap-redact/* の CSP に connect-src 'none' がない。dist/snap-redact/index.html がない
//   2. JS・CSS・HTML・SVG に、許可していない http(s):// / ws(s):// の URL がある
//   3. HTML・SVG に <script> がある（HTML は src のないインラインのもの）。HTML にインラインの <style> がある
//   4. CSS・HTML・SVG に data: URI の埋め込みがある
// プロトコル相対の URL（//example.com）は、JS のコメント（//）と区別できず誤検知が多いため対象外。実行時は CSP が止める。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHeaders } from './lib/headers.mjs';

/**
 * 成果物に含まれてよい URL。ブラウザが読み込みに使うものではなく、仕様の名前空間やコメント・エラーメッセージ中の URL。
 * 追加するときは、実行時に通信しない理由を PR に書くこと。
 */
export const ALLOWED_URLS = [
  /^http:\/\/www\.w3\.org\/(1998\/Math\/MathML|1999\/xlink|1999\/xhtml|2000\/svg|XML\/1998\/namespace)$/, // 名前空間の識別子
  /^https:\/\/react\.dev\/errors(\/\d+)?\/?$/, // React の本番ビルドのエラーメッセージ
  /^https:\/\/tailwindcss\.com\/?$/, // Tailwind のライセンスコメント
  /^https:\/\/circle-note\.com(\/|$)/, // ヘッダー・フッターのリンク
  /^https:\/\/digi-garden\.com\/((terms|privacy)\/)?$/, // フッターの提供元・利用規約・プライバシーポリシー
  /^https:\/\/github\.com\/digi-garden(\/|$)/, // フッター・確認ダイアログのリンク
  // DL-02 の説明文に表示するコード例 fetch('https://example.com')。例示用に予約されたドメイン（RFC 2606）で、
  // 実行するのは利用者が Console で試すときだけ（そのとき CSP がブロックすることを見せるためのもの）
  /^https:\/\/example\.com$/,
];

const URL_PATTERN = /(?:https?|wss?):\/\/[^\s"'`<>()\\]+/g;

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/**
 * @param {string} distDir 検査する dist ディレクトリ
 * @returns {string[]} 問題の一覧（空なら合格）
 */
export function checkDist(distDir) {
  /** @type {string[]} */
  const errors = [];
  const rel = (/** @type {string} */ p) => relative(distDir, p).replaceAll('\\', '/');

  // 1. ヘッダーと出力先
  const headersPath = join(distDir, '_headers');
  if (!existsSync(headersPath)) {
    errors.push('_headers がありません（deploy/_headers のコピー漏れ）');
  } else {
    const rule = parseHeaders(readFileSync(headersPath, 'utf8')).find(
      (r) => r.path === '/snap-redact/*',
    );
    const csp = rule?.headers['Content-Security-Policy'] ?? '';
    if (!/(^|;)\s*connect-src 'none'\s*(;|$)/.test(csp)) {
      errors.push("_headers の /snap-redact/* に connect-src 'none' を含む CSP がありません");
    }
  }
  if (!existsSync(join(distDir, 'snap-redact', 'index.html'))) {
    errors.push('snap-redact/index.html がありません（出力先の設定漏れ）');
  }

  if (!existsSync(distDir)) return errors;
  const files = walk(distDir).filter((f) => /\.(js|mjs|css|html|svg)$/.test(f));

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    // 2. 許可していない URL
    for (const url of new Set(text.match(URL_PATTERN) ?? [])) {
      if (!ALLOWED_URLS.some((re) => re.test(url))) {
        errors.push(`${rel(file)}: 許可していない URL ${url}`);
      }
    }

    if (file.endsWith('.html')) {
      // 3. インラインのスクリプト・スタイル
      for (const tag of text.match(/<script\b[^>]*>/gi) ?? []) {
        if (!/\ssrc\s*=/.test(tag)) errors.push(`${rel(file)}: インラインの <script> があります`);
      }
      if (/<style\b/i.test(text)) errors.push(`${rel(file)}: インラインの <style> があります`);
      // 4. data: URI
      if (/\b(src|href)\s*=\s*["']?\s*data:/i.test(text)) {
        errors.push(`${rel(file)}: data: URI の埋め込みがあります`);
      }
    }
    if (file.endsWith('.svg')) {
      // favicon などの SVG はスクリプトを持たない（03 の 3章 public/favicon.svg）
      if (/<script\b/i.test(text)) errors.push(`${rel(file)}: SVG に <script> があります`);
      if (/\b(href|xlink:href)\s*=\s*["']?\s*data:/i.test(text)) {
        errors.push(`${rel(file)}: data: URI の埋め込みがあります`);
      }
    }
    if (file.endsWith('.css') && /url\(\s*["']?\s*data:/i.test(text)) {
      errors.push(`${rel(file)}: data: URI の埋め込みがあります`);
    }
  }
  return errors;
}

// CLI として実行されたとき
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distDir = join(process.cwd(), 'dist');
  const errors = checkDist(distDir);
  if (errors.length > 0) {
    console.error('check-dist: 失敗');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log('check-dist: 合格（CSP・出力先・外部 URL・インライン・data: URI）');
}
