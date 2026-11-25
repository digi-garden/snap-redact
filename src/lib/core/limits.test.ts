// UT-LIM-01〜03（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { exceedsLimit, MAX_EDGE, MAX_PIXELS } from './limits';

describe('exceedsLimit', () => {
  it('UT-LIM-01：長辺がちょうど MAX_EDGE は上限内', () => {
    expect(exceedsLimit(MAX_EDGE, 100)).toBe(false);
    expect(exceedsLimit(100, MAX_EDGE)).toBe(false);
  });

  it('UT-LIM-02：長辺が MAX_EDGE + 1 は上限超え', () => {
    expect(exceedsLimit(MAX_EDGE + 1, 100)).toBe(true);
    expect(exceedsLimit(100, MAX_EDGE + 1)).toBe(true);
  });

  it('UT-LIM-03：総画素数がちょうど MAX_PIXELS は上限内、1 超えると上限超え', () => {
    // 10,000 × 10,000 = 1 億（長辺は MAX_EDGE 以内）
    expect(10_000 * 10_000).toBe(MAX_PIXELS);
    expect(exceedsLimit(10_000, 10_000)).toBe(false);
    expect(exceedsLimit(10_000, 10_001)).toBe(true);
  });

  it('よくある画像は上限内（4K、DevTools の縦長フルページ）', () => {
    expect(exceedsLimit(3840, 2160)).toBe(false);
    expect(exceedsLimit(1920, 15_000)).toBe(false);
  });
});
