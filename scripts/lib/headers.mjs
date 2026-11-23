// Cloudflare Pages の _headers を読む小さなパーサー。
// vite preview に同じヘッダーを付ける処理（vite.config.ts）と、成果物の検査（check-dist.mjs）で共有する。

/**
 * @param {string} text _headers の中身
 * @returns {Array<{ path: string; headers: Record<string, string> }>}
 */
export function parseHeaders(text) {
  /** @type {Array<{ path: string; headers: Record<string, string> }>} */
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    const indented = /^\s/.test(raw);
    if (!indented) {
      rules.push({ path: raw.trim(), headers: {} });
      continue;
    }
    const current = rules.at(-1);
    const sep = raw.indexOf(':');
    if (current === undefined || sep === -1) continue;
    const name = raw.slice(0, sep).trim();
    const value = raw.slice(sep + 1).trim();
    current.headers[name] = value;
  }
  return rules;
}
