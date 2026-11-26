// 画面座標と原寸座標の変換、矩形の正規化と整数化（docs/02-functional-design.md 3.5.1・3.5.2）
import type { Point, Rect } from './types';

/** 画面上の表示位置と大きさ（getBoundingClientRect() の値。lib/core は DOM の型を使えないので自前で持つ） */
export type Box = { left: number; top: number; width: number; height: number };

/** ED-6：幅・高さとも、この値未満の矩形は破棄する */
export const MIN_RECT_SIZE = 3;

/**
 * 画面座標 → 原寸座標（3.5.1）。小数のまま返す（整数化は toRect で行う）。
 * キャンバスの外の点もそのまま返す（toRect で画像の範囲に切り詰める）。
 */
export function toImagePoint(
  clientX: number,
  clientY: number,
  box: Box,
  width: number,
  height: number,
): Point {
  const sx = width / box.width;
  const sy = height / box.height;
  return { x: (clientX - box.left) * sx, y: (clientY - box.top) * sy };
}

/**
 * 2点から矩形を作る（3.5.2）。始点は切り捨て、終点は切り上げて、覆った範囲より狭くしない。
 * 画像の範囲に切り詰め、面積がない、幅・高さとも 3px 未満、または座標が数でないなら null。
 */
export function toRect(a: Point, b: Point, width: number, height: number): Rect | null {
  // 表示サイズが 0 のときなど、座標が数でない（NaN・Infinity）なら矩形にしない
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x)));
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y)));
  const right = Math.min(width, Math.ceil(Math.max(a.x, b.x)));
  const bottom = Math.min(height, Math.ceil(Math.max(a.y, b.y)));
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return null; // 面積がない（画像の完全に外側も含む）
  if (w < MIN_RECT_SIZE && h < MIN_RECT_SIZE) return null;
  return { x: left, y: top, w, h };
}

/** 原寸の矩形 → 表示上の位置と大きさ（box の左上を原点とする）。選択枠の表示に使う */
export function toDisplayBox(rect: Rect, box: Box, width: number, height: number): Box {
  const sx = box.width / width;
  const sy = box.height / height;
  return { left: rect.x * sx, top: rect.y * sy, width: rect.w * sx, height: rect.h * sy };
}
