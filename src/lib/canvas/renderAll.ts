import type { Op } from '../core/types';
import { applyOp } from './applyOp';

/**
 * 元画像から全体を描き直す（Undo、docs/02 の 3.8・3.9）。
 * clearRect → 元画像 → ops を古い順に applyOp。
 * モザイクが描けなかった操作は、その範囲を黒で塗る（隠すべき範囲が見えたまま残らないように）。
 * @returns すべての操作を指定どおりに描けたら true。黒で代わりに塗ったものがあれば false
 */
export function renderAll(
  ctx: CanvasRenderingContext2D,
  base: CanvasImageSource,
  ops: readonly Op[],
  work: HTMLCanvasElement,
): boolean {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(base, 0, 0); // 透過部分は透明のまま
  let ok = true;
  for (const op of ops) {
    let drawn: boolean;
    try {
      drawn = applyOp(ctx, op, work);
    } catch {
      drawn = false;
    }
    if (!drawn) {
      ok = false;
      applyOp(ctx, { kind: 'fill', rect: op.rect }, work); // 黒塗りは失敗しない
    }
  }
  return ok;
}
