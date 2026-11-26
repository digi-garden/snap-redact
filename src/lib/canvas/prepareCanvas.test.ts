// UT-CNV-04〜05（docs/06-test-design.md 2.2）
// jsdom は Canvas の描画を実装していないので、呼び出しを記録するだけの偽物を使う。
import { describe, expect, it, vi } from 'vitest';
import { prepareCanvas } from './prepareCanvas';

function fakeCanvas(ctx: unknown) {
  return { width: 0, height: 0, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement;
}

const image = {} as CanvasImageSource;

describe('prepareCanvas', () => {
  it('原寸に設定して元画像を描き、その Canvas を返す', () => {
    const ctx = { drawImage: vi.fn() };
    const canvas = fakeCanvas(ctx);
    expect(prepareCanvas(image, 1920, 1080, () => canvas)).toBe(canvas);
    expect([canvas.width, canvas.height]).toEqual([1920, 1080]);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0);
  });

  it('UT-CNV-04：getContext が null なら null を返し、Canvas を 0×0 に戻す', () => {
    const canvas = fakeCanvas(null);
    expect(prepareCanvas(image, 20000, 20000, () => canvas)).toBe(null);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });

  it('UT-CNV-05：drawImage が例外なら null を返し、Canvas を 0×0 に戻す', () => {
    const ctx = {
      drawImage: vi.fn(() => {
        throw new Error('too large');
      }),
    };
    const canvas = fakeCanvas(ctx);
    expect(prepareCanvas(image, 100, 100, () => canvas)).toBe(null);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });
});
