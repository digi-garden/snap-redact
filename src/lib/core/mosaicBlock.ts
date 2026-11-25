// モザイクのブロックの大きさ（ED-3、docs/02 の 3.6.2）
// 文字が読めないよう大きめにする：画像の短辺の約 2%、最低 16px。
// 操作を作る時点で決めて Op に保存する（描き直しても結果が変わらないように）。

export const MIN_MOSAIC_BLOCK = 16;
export const MOSAIC_BLOCK_RATIO = 0.02;

export function mosaicBlockSize(width: number, height: number): number {
  return Math.max(MIN_MOSAIC_BLOCK, Math.round(Math.min(width, height) * MOSAIC_BLOCK_RATIO));
}
