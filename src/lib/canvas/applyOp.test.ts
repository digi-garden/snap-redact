// UT-CNV-01・02（docs/06-test-design.md 2.1）
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
    const ok = applyOp(
      ctx as unknown as CanvasRenderingContext2D,
      { kind: 'fill', rect: { x: 10, y: 20, w: 41, h: 2 } },
      work,
    );
    expect(ok).toBe(true);
    expect(FILL_COLOR).toBe('#000000');
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 41, 2);
    const args = ctx.fillRect.mock.calls[0] as number[];
    expect(args.every(Number.isInteger)).toBe(true);
    // 前の設定（半透明・別の合成方法）が残っていても、不透明の上書きで塗る
    expect(calls).toEqual(['save', 'fillRect #000000 1 source-over', 'restore']);
  });
  describe('モザイク', () => {
    /** 描画先と作業用 Canvas への呼び出しを、1本の記録にまとめる */
    function mosaicSetup(workContext: 'ok' | 'null' = 'ok') {
      const calls: string[] = [];
      const target = { id: 'target' };
      const wctx = {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        clearRect: vi.fn((...a: number[]) => calls.push(`work.clearRect ${a.join(',')}`)),
        drawImage: vi.fn((src: unknown, ...a: number[]) => {
          calls.push(
            `work.drawImage ${src === target ? 'target' : '?'} ${a.join(',')} smoothing=${String(wctx.imageSmoothingEnabled)} ${wctx.imageSmoothingQuality}`,
          );
        }),
      };
      const work = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => (workContext === 'ok' ? wctx : null)),
      };
      const ctx = {
        canvas: target,
        imageSmoothingEnabled: true,
        globalAlpha: 0.3,
        globalCompositeOperation: 'multiply',
        save: vi.fn(() => calls.push('save')),
        restore: vi.fn(() => calls.push('restore')),
        clearRect: vi.fn((...a: number[]) => calls.push(`clearRect ${a.join(',')}`)),
        drawImage: vi.fn((src: unknown, ...a: number[]) => {
          calls.push(
            `drawImage ${src === work ? 'work' : '?'} ${a.join(',')} smoothing=${String(ctx.imageSmoothingEnabled)} alpha=${ctx.globalAlpha} ${ctx.globalCompositeOperation}`,
          );
        }),
      };
      return { calls, ctx, work };
    }

    it('UT-CNV-02：作業用へ縮小 → 対象範囲を clearRect → ぼかさずに拡大して戻す、の順', () => {
      const { calls, ctx, work } = mosaicSetup();
      const ok = applyOp(
        ctx as unknown as CanvasRenderingContext2D,
        { kind: 'mosaic', rect: { x: 10, y: 20, w: 100, h: 30 }, blockSize: 22 },
        work as unknown as HTMLCanvasElement,
      );
      expect(ok).toBe(true);
      // 100/22 → 5、30/22 → 2（切り上げ）
      expect([work.width, work.height]).toEqual([5, 2]);
      expect(calls).toEqual([
        'work.clearRect 0,0,5,2',
        'work.drawImage target 10,20,100,30,0,0,5,2 smoothing=true high',
        'save',
        'clearRect 10,20,100,30',
        'drawImage work 0,0,5,2,10,20,100,30 smoothing=false alpha=1 source-over',
        'restore',
      ]);
    });

    it('ブロックより小さい範囲でも、作業用は 1×1 以上', () => {
      const { ctx, work } = mosaicSetup();
      applyOp(
        ctx as unknown as CanvasRenderingContext2D,
        { kind: 'mosaic', rect: { x: 0, y: 0, w: 3, h: 80 }, blockSize: 16 },
        work as unknown as HTMLCanvasElement,
      );
      expect([work.width, work.height]).toEqual([1, 5]);
    });

    it('作業用 Canvas の getContext が null → false を返し、描画先には触れない', () => {
      const { calls, ctx, work } = mosaicSetup('null');
      const ok = applyOp(
        ctx as unknown as CanvasRenderingContext2D,
        { kind: 'mosaic', rect: { x: 10, y: 20, w: 100, h: 30 }, blockSize: 22 },
        work as unknown as HTMLCanvasElement,
      );
      expect(ok).toBe(false);
      expect(calls).toEqual([]);
    });
  });
});
