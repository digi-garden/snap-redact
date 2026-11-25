import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { parseHeaders } from './scripts/lib/headers.mjs';

// vite preview にも本番と同じヘッダー（CSP など）を付ける。値は deploy/_headers だけに持つ（05 の 2.1）
const previewHeaders =
  parseHeaders(readFileSync('deploy/_headers', 'utf8')).find(
    (rule) => rule.path === '/snap-redact/*',
  )?.headers ?? {};

// 設計：docs/05-devenv-cicd.md 3章
export default defineConfig({
  // サブパス /snap-redact/ で配信する（05 の 6.1）
  base: '/snap-redact/',
  plugins: [react(), tailwindcss()],
  build: {
    // dist/snap-redact/ に出力し、プレビュー URL でも本番でも同じパスにする（05 の 6.1）
    outDir: 'dist/snap-redact',
    emptyOutDir: true,
    // 小さな画像・フォントを data: URI に埋め込ませない（04 の img-src 'self' と整合）
    assetsInlineLimit: 0,
    // Public リポジトリなので隠さない。利用者がコードを確かめやすくする（柱A）
    sourcemap: true,
    // 対応ブラウザは最新版のみ
    target: 'es2022',
    modulePreload: { polyfill: false },
  },
  preview: {
    headers: previewHeaders,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{js,mjs,ts}'],
    setupFiles: ['src/test/setup.ts'],
    passWithNoTests: true,
  },
});
