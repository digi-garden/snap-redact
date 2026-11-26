// UT-GEO-01〜11（docs/06-test-design.md 2.1）
import { describe, expect, it } from 'vitest';
import { toDisplayBox, toImagePoint, toRect } from './geometry';

describe('toImagePoint', () => {
  it('UT-GEO-01：縮小表示（表示 960px・原寸 1920px）で (100, 50) → (200, 100)', () => {
    const box = { left: 0, top: 0, width: 960, height: 540 };
    expect(toImagePoint(100, 50, box, 1920, 1080)).toEqual({ x: 200, y: 100 });
  });

  it('表示位置（left, top）を差し引く', () => {
    const box = { left: 40, top: 30, width: 960, height: 540 };
    expect(toImagePoint(140, 80, box, 1920, 1080)).toEqual({ x: 200, y: 100 });
  });

  it('UT-GEO-02：割り切れない縮小率（原寸 1919px・表示 1000px）では小数のまま返る', () => {
    const box = { left: 0, top: 0, width: 1000, height: 500 };
    const p = toImagePoint(333, 111, box, 1919, 959.5);
    expect(p.x).toBeCloseTo(333 * 1.919, 10);
    expect(Number.isInteger(p.x)).toBe(false);
  });
});

describe('toRect', () => {
  it('UT-GEO-03：左上 → 右下', () => {
    expect(toRect({ x: 10, y: 20 }, { x: 50, y: 60 }, 100, 100)).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    });
  });

  it('UT-GEO-04：右下 → 左上でも同じ矩形', () => {
    expect(toRect({ x: 50, y: 60 }, { x: 10, y: 20 }, 100, 100)).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    });
  });

  it('UT-GEO-05：始点 (10.7, 20.2)・終点 (50.1, 60.9) → 外側に丸めて x=10, y=20, w=41, h=41', () => {
    expect(toRect({ x: 10.7, y: 20.2 }, { x: 50.1, y: 60.9 }, 100, 100)).toEqual({
      x: 10,
      y: 20,
      w: 41,
      h: 41,
    });
  });

  it('UT-GEO-06：画像の外まではみ出すと、画像の範囲に切り詰める', () => {
    expect(toRect({ x: -30, y: -5 }, { x: 150, y: 80 }, 100, 60)).toEqual({
      x: 0,
      y: 0,
      w: 100,
      h: 60,
    });
  });

  it('UT-GEO-07：画像の完全に外側 → null', () => {
    expect(toRect({ x: 120, y: 10 }, { x: 180, y: 50 }, 100, 100)).toBeNull(); // 右の外（縦は範囲内）
    expect(toRect({ x: 10, y: -80 }, { x: 50, y: -20 }, 100, 100)).toBeNull(); // 上の外
    expect(toRect({ x: -50, y: -50 }, { x: -10, y: -10 }, 100, 100)).toBeNull(); // 左上の外
  });

  it('UT-GEO-08：幅 2px・高さ 2px → null（ED-6）', () => {
    expect(toRect({ x: 10, y: 10 }, { x: 12, y: 12 }, 100, 100)).toBeNull();
  });

  it('UT-GEO-09：幅 80px・高さ 2px → 有効（細い矩形）', () => {
    expect(toRect({ x: 10, y: 10 }, { x: 90, y: 12 }, 100, 100)).toEqual({
      x: 10,
      y: 10,
      w: 80,
      h: 2,
    });
  });

  it('UT-GEO-10：幅 0（クリックだけ） → null', () => {
    expect(toRect({ x: 10, y: 10 }, { x: 10, y: 10 }, 100, 100)).toBeNull();
    expect(toRect({ x: 10, y: 10 }, { x: 10, y: 60 }, 100, 100)).toBeNull(); // 縦にだけ動かした
  });

  it('UT-GEO-11：整数化した矩形は、元の小数の範囲（画像内の部分）を必ず含む（1,000 組）', () => {
    // 再現できるよう、決まった種の擬似乱数を使う
    let seed = 20261126;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };
    const W = 1919;
    const H = 1079;
    let checked = 0;
    for (let i = 0; i < 1000; i++) {
      const a = { x: rand() * (W + 200) - 100, y: rand() * (H + 200) - 100 };
      const b = { x: rand() * (W + 200) - 100, y: rand() * (H + 200) - 100 };
      const r = toRect(a, b, W, H);
      const left = Math.max(0, Math.min(a.x, b.x));
      const top = Math.max(0, Math.min(a.y, b.y));
      const right = Math.min(W, Math.max(a.x, b.x));
      const bottom = Math.min(H, Math.max(a.y, b.y));
      if (!r) continue;
      checked++;
      expect(Number.isInteger(r.x) && Number.isInteger(r.y)).toBe(true);
      expect(Number.isInteger(r.w) && Number.isInteger(r.h)).toBe(true);
      expect(r.x).toBeLessThanOrEqual(left);
      expect(r.y).toBeLessThanOrEqual(top);
      expect(r.x + r.w).toBeGreaterThanOrEqual(right);
      expect(r.y + r.h).toBeGreaterThanOrEqual(bottom);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(W);
      expect(r.y + r.h).toBeLessThanOrEqual(H);
    }
    expect(checked).toBeGreaterThan(900);
  });
});

describe('toDisplayBox', () => {
  it('原寸の矩形を表示の大きさに戻す', () => {
    const box = { left: 40, top: 30, width: 960, height: 540 };
    expect(toDisplayBox({ x: 200, y: 100, w: 400, h: 20 }, box, 1920, 1080)).toEqual({
      left: 100,
      top: 50,
      width: 200,
      height: 10,
    });
  });
});
