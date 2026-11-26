import type { Op } from '../core/types';

/** 黒塗りの色。不透明の黒なので、下の画素は残らない（docs/02 の 3.6.1） */
export const FILL_COLOR = '#000000';

/**
 * 操作を1件、描画先に描く（docs/02 の 3.6・3.8）。
 * 矩形の座標は整数（toRect で整数化済み）なので、端に半透明の画素ができない。
 * @param work モザイク用の作業 Canvas（S9 で使う）
 */
export function applyOp(ctx: CanvasRenderingContext2D, op: Op, work: HTMLCanvasElement): void {
  switch (op.kind) {
    case 'fill': {
      const { x, y, w, h } = op.rect;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = FILL_COLOR;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      return;
    }
    case 'mosaic':
      // S9 で実装する（それまで App はモザイクの操作を作らない）
      void work;
      return;
  }
}
