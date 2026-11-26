import type { Op, Rect } from '../core/types';

/** 黒塗りの色。不透明の黒なので、下の画素は残らない（docs/02 の 3.6.1） */
export const FILL_COLOR = '#000000';

/**
 * 操作を1件、描画先に描く（docs/02 の 3.6・3.8）。
 * 矩形の座標は整数（toRect で整数化済み）なので、端に半透明の画素ができない。
 * @param work モザイク用の作業 Canvas（1枚を使い回す）
 * @returns 描けたら true。作業用 Canvas が使えないときは、描画先に触れずに false
 */
export function applyOp(ctx: CanvasRenderingContext2D, op: Op, work: HTMLCanvasElement): boolean {
  switch (op.kind) {
    case 'fill': {
      const { x, y, w, h } = op.rect;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = FILL_COLOR;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      return true;
    }
    case 'mosaic':
      return applyMosaic(ctx, work, op.rect, op.blockSize);
  }
}

/**
 * モザイク（docs/02 の 3.6.2）。範囲を作業用 Canvas に縮小して平均し、ぼかさずに拡大して戻す。
 * 戻す前に範囲を clearRect で透明にする：既定の合成（source-over）では、半透明のブロックの下に
 * 元の画素が残り、透過 PNG の文字が透けて読めてしまうため（MT-11）。
 */
function applyMosaic(
  ctx: CanvasRenderingContext2D,
  work: HTMLCanvasElement,
  rect: Rect,
  block: number,
): boolean {
  const sw = Math.max(1, Math.ceil(rect.w / block));
  const sh = Math.max(1, Math.ceil(rect.h / block));
  work.width = sw;
  work.height = sh;
  const wctx = work.getContext('2d');
  if (!wctx) return false; // ここまで描画先には触れていない

  wctx.clearRect(0, 0, sw, sh);
  wctx.imageSmoothingEnabled = true; // 縮小時は平均化させる
  wctx.imageSmoothingQuality = 'high'; // 大きく縮小しても画素を平均させる（非対応の環境では無視される）
  wctx.drawImage(ctx.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, sw, sh);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(rect.x, rect.y, rect.w, rect.h); // 元の画素を消してから描く
  ctx.imageSmoothingEnabled = false; // 拡大時はぼかさずブロックにする
  ctx.drawImage(work, 0, 0, sw, sh, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  return true;
}
