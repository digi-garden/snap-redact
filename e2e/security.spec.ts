// 柱A（送信しないことを確かめられる）のブラウザでの確認。docs/04-security-design.md
import { expect, test } from '@playwright/test';

test('CSP（connect-src none）が付き、同じオリジン以外へのリクエストがない', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  const response = await page.goto('./');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("connect-src 'none'");
  expect(csp).toContain("default-src 'none'");

  await expect(page.getByText('Snap-Redact').first()).toBeVisible();
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:'))).toEqual([]);
  expect(errors).toEqual([]);
});

test('CSP によって、ページの中からの fetch は止められる', async ({ page }) => {
  await page.goto('./');
  const result = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return 'sent';
    } catch {
      return 'blocked';
    }
  });
  expect(result).toBe('blocked');
});
