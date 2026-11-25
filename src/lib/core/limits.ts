// 画像サイズの上限（IN-7、docs/02 の 3.4 手順3）
// 初期値。S7 で4ブラウザの実機確認（Canvas の作成と toBlob が成功する範囲）をして確定する（02 の 8章 #2）。

/** 長辺の上限（px） */
export const MAX_EDGE = 16_384;

/** 総画素数の上限 */
export const MAX_PIXELS = 100_000_000;

/** 上限を超えていれば true */
export function exceedsLimit(width: number, height: number): boolean {
  return Math.max(width, height) > MAX_EDGE || width * height > MAX_PIXELS;
}
