import { describe, expect, it } from 'vitest';
import { isMac, isMobileLike } from './platform';

const nav = (platform: string, uaPlatform?: string) =>
  ({
    platform,
    ...(uaPlatform === undefined ? {} : { userAgentData: { platform: uaPlatform } }),
  }) as unknown as Navigator;

describe('isMac', () => {
  it.each([
    ['MacIntel', undefined, true],
    ['Win32', undefined, false],
    ['Linux x86_64', undefined, false],
    ['iPhone', undefined, true],
    ['', 'macOS', true],
    ['', 'Windows', false],
    ['MacIntel', 'Windows', false], // userAgentData を優先する
  ])('platform=%s, userAgentData=%s → %s', (platform, uaPlatform, expected) => {
    expect(isMac(nav(platform, uaPlatform))).toBe(expected);
  });
});

describe('isMobileLike', () => {
  it('メディアクエリに一致すれば true', () => {
    const win = { matchMedia: () => ({ matches: true }) } as unknown as Window;
    expect(isMobileLike(win)).toBe(true);
  });

  it('一致しなければ false', () => {
    const win = { matchMedia: () => ({ matches: false }) } as unknown as Window;
    expect(isMobileLike(win)).toBe(false);
  });

  it('幅とポインターの両方を見るクエリを使う', () => {
    let query = '';
    const win = {
      matchMedia: (q: string) => {
        query = q;
        return { matches: false };
      },
    } as unknown as Window;
    isMobileLike(win);
    expect(query).toBe('(max-width: 767px), (pointer: coarse)');
  });
});
