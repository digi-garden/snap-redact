// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseHeaders } from './headers.mjs';

describe('parseHeaders', () => {
  it('パスごとにヘッダーを読み、コメントと空行を飛ばす', () => {
    const text = [
      '# comment',
      '/snap-redact/*',
      "  Content-Security-Policy: default-src 'none'; connect-src 'none'",
      '  X-Content-Type-Options: nosniff',
      '',
      '/other/*',
      '  Referrer-Policy: no-referrer',
    ].join('\n');
    expect(parseHeaders(text)).toEqual([
      {
        path: '/snap-redact/*',
        headers: {
          'Content-Security-Policy': "default-src 'none'; connect-src 'none'",
          'X-Content-Type-Options': 'nosniff',
        },
      },
      { path: '/other/*', headers: { 'Referrer-Policy': 'no-referrer' } },
    ]);
  });
});
