import { useLayoutEffect, useRef } from 'react';
import { toDisplayBox } from '../lib/core/geometry';
import type { Mode, Rect } from '../lib/core/types';

type Props = {
  canvas: HTMLCanvasElement;
  /** 原寸の矩形（整数化後） */
  rect: Rect;
  width: number;
  height: number;
  mode: Mode;
};

/** 内側の色：黒塗りは黒 40%、モザイクはアクセントカラー 15%（docs/01 の 3.3） */
const FILL_CLASS: Record<Mode, string> = {
  fill: 'bg-black/40',
  mosaic: 'bg-emerald-500/15',
};

/**
 * ドラッグ中の選択枠（docs/01 の 3.3、docs/02 の 3.5）。
 * Canvas には描かず、上に重ねた要素で表示するので、出力には混ざらない。
 * 位置は、原寸の矩形を Canvas の表示位置（getBoundingClientRect）に戻して決める（docs/03 の 5.2）。
 */
export function SelectionOverlay({ canvas, rect, width, height, mode }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent;
    if (!el || !parent) return;
    const c = canvas.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    const d = toDisplayBox(rect, c, width, height);
    el.style.left = `${c.left - p.left + d.left}px`;
    el.style.top = `${c.top - p.top + d.top}px`;
    el.style.width = `${d.width}px`;
    el.style.height = `${d.height}px`;
  }, [canvas, rect, width, height]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="selection"
      className={`pointer-events-none absolute border-2 border-emerald-500 ${FILL_CLASS[mode]}`}
    />
  );
}
