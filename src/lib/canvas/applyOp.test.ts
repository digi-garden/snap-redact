// UT-CNV-01（docs/06-test-design.md 2.1）
import { describe, expect, it, vi } from 'vitest';
import { applyOp, FILL_COLOR } from './applyOp';

/** 呼ばれた順と、fillRect を呼んだ時点の設定を記録する偽物の 2D コンテキスト */
function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '#ffffff',
    globalAlpha: 0.5,
    globalCompositeOperation: 'multiply',
    save: vi.fn(() => calls.push('save')),
    restore: vi.fn(() => calls.push('restore')),
    fillRect: vi.fn(() => {
      calls.push(`fillRect ${ctx.fillStyle} ${ctx.globalAlpha} ${ctx.globalCompositeOperation}`);
    }),
  };
  return { ctx, calls };
}

describe('applyOp', () => {
  it('UT-CNV-01：黒塗りは不透明の #000000 で、整数の座標の fillRect', () => {
    const { ctx, calls } = fakeContext();
    const work = {} as HTMLCanvasElement;
    applyOp(
      ctx as unknown as CanvasRenderingContext2D,
      { kind: 'fill', rect: { x: 10, y: 20, w: 41, h: 2 } },
      work,
    );
    expect(FILL_COLOR).toBe('#000000');
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 41, 2);
    const args = ctx.fillRect.mock.calls[0] as number[];
    expect(args.every(Number.isInteger)).toBe(true);
    // 前の設定（半透明・別の合成方法）が残っていても、不透明の上書きで塗る
    expect(calls).toEqual(['save', 'fillRect #000000 1 source-over', 'restore']);
  });
});
