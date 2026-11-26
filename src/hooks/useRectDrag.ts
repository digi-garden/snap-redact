import { useCallback, useEffect, useRef, useState } from 'react';
import { toImagePoint, toRect } from '../lib/core/geometry';
import type { Point, Rect } from '../lib/core/types';

type Options = {
  /** 表示用 Canvas。未読み込みなら null */
  canvas: HTMLCanvasElement | null;
  /** 画像の原寸 */
  width: number;
  height: number;
  /** 矩形を指定できるか（読み込み済みで、ダイアログが開いていない） */
  enabled: boolean;
  /** 矩形が確定したとき（3px 未満などで破棄したときは呼ばない） */
  onCommit: (rect: Rect) => void;
};

/** ドラッグ中の2点。どの Canvas の上のドラッグかも持つ（Canvas が替わったら無効にする） */
type Drag = { canvas: HTMLCanvasElement; start: Point; current: Point };

/**
 * 矩形の指定（F-05、docs/02 の 3.5）。Pointer Events を Canvas 要素で直接購読する。
 * - 主ボタンのみ。setPointerCapture で、キャンバスの外に出ても追いかける
 * - 離したときに矩形を確定する（3.5.2。小さすぎる矩形は破棄）
 * - pointercancel・キャプチャの喪失・cancel()（Esc）・Canvas の差し替え（LOAD／CLEAR）で破棄する
 */
export function useRectDrag({ canvas, width, height, enabled, onCommit }: Options) {
  const [drag, setDrag] = useState<Drag | null>(null);
  /** イベント処理の中で同期的に読むための、ドラッグ中の情報 */
  const active = useRef<{ pointerId: number; start: Point } | null>(null);

  // イベントの購読は Canvas ごとに一度だけにし、最新の設定は ref から読む
  const latest = useRef({ width, height, enabled, onCommit });
  useEffect(() => {
    latest.current = { width, height, enabled, onCommit };
  }, [width, height, enabled, onCommit]);

  useEffect(() => {
    if (!canvas) return;

    const toPoint = (event: PointerEvent): Point =>
      toImagePoint(
        event.clientX,
        event.clientY,
        canvas.getBoundingClientRect(),
        latest.current.width,
        latest.current.height,
      );
    const isActive = (event: PointerEvent) => active.current?.pointerId === event.pointerId;
    const discard = () => {
      active.current = null;
      setDrag(null);
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      if (!latest.current.enabled || active.current) return;
      event.preventDefault(); // 文字の選択などを始めない
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // 取れなくてもドラッグは続けられる（外に出ると止まるだけ）
      }
      const start = toPoint(event);
      active.current = { pointerId: event.pointerId, start };
      setDrag({ canvas, start, current: start });
    };
    const onMove = (event: PointerEvent) => {
      const a = active.current;
      if (!a || !isActive(event)) return;
      setDrag({ canvas, start: a.start, current: toPoint(event) });
    };
    const onUp = (event: PointerEvent) => {
      const a = active.current;
      if (!a || !isActive(event)) return;
      const end = toPoint(event);
      discard();
      const { width: w, height: h, enabled: ok, onCommit: commit } = latest.current;
      if (!ok) return;
      const rect = toRect(a.start, end, w, h);
      if (rect) commit(rect);
    };
    const onCancel = (event: PointerEvent) => {
      if (isActive(event)) discard();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('lostpointercapture', onCancel);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel);
      active.current = null;
    };
  }, [canvas]);

  /** ドラッグを破棄する（Esc。docs/02 の 4章） */
  const cancel = useCallback(() => {
    const a = active.current;
    if (!a) return;
    active.current = null;
    setDrag(null);
    try {
      canvas?.releasePointerCapture(a.pointerId);
    } catch {
      // すでに外れている
    }
  }, [canvas]);

  // Canvas が替わった（LOAD／CLEAR）後は、前の Canvas のドラッグを表示しない
  const current = drag && drag.canvas === canvas ? drag : null;
  return {
    isDragging: current !== null,
    /** 選択枠に表示する矩形（整数化後。小さすぎるときは null） */
    rect: current ? toRect(current.start, current.current, width, height) : null,
    cancel,
  };
}
