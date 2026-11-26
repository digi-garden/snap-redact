// UT-CNV-03（docs/06-test-design.md 2.1）
import { describe, expect, it, vi } from 'vitest';
import type { Op } from '../core/types';
import { renderAll } from './renderAll';

/** 描画先への呼び出しを順に記録する。作業用 Canvas の getContext を null にもできる */
function setup(workContext: 'ok' | 'null' = 'ok') {
  const calls: string[] = [];
  const canvas = { width: 200, height: 100 };
  const ctx = {
    canvas,
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn((...a: number[]) => calls.push(`clearRect ${a.join(',')}`)),
    drawImage: vi.fn((src: unknown, ...a: number[]) =>
      calls.push(`drawImage ${src === base ? 'base' : src === work ? 'work' : '?'} ${a.join(',')}`),
    ),
    fillRect: vi.fn((...a: number[]) => calls.push(`fillRect ${a.join(',')}`)),
  };
  const base = { id: 'base' };
  const wctx = { clearRect: vi.fn(), drawImage: vi.fn() };
  const work = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (workContext === 'ok' ? wctx : null)),
  };
  const run = (ops: Op[]) =>
    renderAll(
      ctx as unknown as CanvasRenderingContext2D,
      base as unknown as CanvasImageSource,
      ops,
      work as unknown as HTMLCanvasElement,
    );
  return { calls, run };
}

const fill: Op = { kind: 'fill', rect: { x: 1, y: 2, w: 30, h: 4 } };
const mosaic: Op = { kind: 'mosaic', rect: { x: 10, y: 10, w: 32, h: 16 }, blockSize: 16 };

describe('renderAll', () => {
  it('UT-CNV-03：clearRect → drawImage(base) → 各 op を古い順に', () => {
    const { calls, run } = setup();
    expect(run([fill, mosaic])).toBe(true);
    expect(calls).toEqual([
      'clearRect 0,0,200,100',
      'drawImage base 0,0',
      'fillRect 1,2,30,4',
      'clearRect 10,10,32,16',
      'drawImage work 0,0,2,1,10,10,32,16',
    ]);
  });

  it('ops が 0 件なら、元画像を描くだけ', () => {
    const { calls, run } = setup();
    expect(run([])).toBe(true);
    expect(calls).toEqual(['clearRect 0,0,200,100', 'drawImage base 0,0']);
  });

  it('モザイクが描けない → その範囲を黒で塗り、false を返す（見えたまま残さない）', () => {
    const { calls, run } = setup('null');
    expect(run([mosaic, fill])).toBe(false);
    expect(calls).toEqual([
      'clearRect 0,0,200,100',
      'drawImage base 0,0',
      'fillRect 10,10,32,16',
      'fillRect 1,2,30,4',
    ]);
  });
});
