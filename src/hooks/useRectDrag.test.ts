// F-05（docs/02 の 3.5）。座標の計算そのものは geometry.test.ts（UT-GEO）で確かめる。
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRectDrag } from './useRectDrag';

/** 表示 500×250（原寸 1000×500 の半分）で、(100, 50) の位置にある Canvas */
function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () =>
    ({ left: 100, top: 50, width: 500, height: 250, right: 600, bottom: 300 }) as DOMRect;
  return canvas;
}

type PointerInit = {
  x: number;
  y: number;
  button?: number;
  pointerId?: number;
  isPrimary?: boolean;
};

/** jsdom の PointerEvent に頼らず、必要な値を付けたイベントを送る */
function pointer(target: EventTarget, type: string, init: PointerInit) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    clientX: init.x,
    clientY: init.y,
    button: init.button ?? 0,
    pointerId: init.pointerId ?? 1,
    isPrimary: init.isPrimary ?? true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

type HookProps = { canvas: HTMLCanvasElement | null; enabled: boolean };

function setup(options: { enabled?: boolean } = {}) {
  const onCommit = vi.fn();
  const first = makeCanvas();
  const hook = renderHook<ReturnType<typeof useRectDrag>, HookProps>(
    (props) =>
      useRectDrag({
        canvas: props.canvas,
        width: 1000,
        height: 500,
        enabled: props.enabled,
        onCommit,
      }),
    {
      initialProps: {
        canvas: first,
        enabled: options.enabled ?? true,
      },
    },
  );
  return { ...hook, canvas: first, onCommit };
}

describe('useRectDrag', () => {
  it('ドラッグして離すと、原寸の矩形で確定する（表示は半分の大きさ）', () => {
    const { result, canvas, onCommit } = setup();
    const down = pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    expect(down.defaultPrevented).toBe(true);
    expect(result.current.isDragging).toBe(true);
    pointer(canvas, 'pointermove', { x: 160, y: 80 });
    expect(result.current.rect).toEqual({ x: 20, y: 20, w: 100, h: 40 });
    pointer(canvas, 'pointerup', { x: 160, y: 80 });
    expect(onCommit).toHaveBeenCalledWith({ x: 20, y: 20, w: 100, h: 40 });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.rect).toBeNull();
  });

  it('小さすぎる矩形（クリックだけ）は確定しない', () => {
    const { canvas, onCommit } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    pointer(canvas, 'pointerup', { x: 110, y: 60 });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('主ボタン以外・主でないポインター（2本目の指）では始めない', () => {
    const { result, canvas } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60, button: 2 });
    pointer(canvas, 'pointerdown', { x: 110, y: 60, isPrimary: false });
    expect(result.current.isDragging).toBe(false);
  });

  it('受け付けないとき（ダイアログ表示中など）は始めない', () => {
    const { result, canvas } = setup({ enabled: false });
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    expect(result.current.isDragging).toBe(false);
  });

  it('別のポインターの動きと離すのは無視する', () => {
    const { result, canvas, onCommit } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60, pointerId: 1 });
    pointer(canvas, 'pointerup', { x: 300, y: 200, pointerId: 2 });
    expect(result.current.isDragging).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('pointercancel で破棄する', () => {
    const { result, canvas, onCommit } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    pointer(canvas, 'pointercancel', { x: 160, y: 80 });
    expect(result.current.isDragging).toBe(false);
    pointer(canvas, 'pointerup', { x: 160, y: 80 });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('cancel()（Esc）で破棄し、その後に離しても確定しない', () => {
    const { result, canvas, onCommit } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    pointer(canvas, 'pointermove', { x: 160, y: 80 });
    act(() => result.current.cancel());
    expect(result.current.isDragging).toBe(false);
    pointer(canvas, 'pointerup', { x: 160, y: 80 });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('Canvas が替わる（LOAD／CLEAR）とドラッグを破棄し、前の Canvas のイベントは無視する', () => {
    const { result, rerender, canvas, onCommit } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    const next = makeCanvas();
    rerender({ canvas: next, enabled: true });
    expect(result.current.isDragging).toBe(false);
    pointer(canvas, 'pointerup', { x: 160, y: 80 });
    expect(onCommit).not.toHaveBeenCalled();
    // 新しい Canvas ではドラッグできる
    pointer(next, 'pointerdown', { x: 110, y: 60 });
    pointer(next, 'pointerup', { x: 160, y: 80 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('クリア（Canvas が null）でドラッグを破棄する', () => {
    const { result, rerender, canvas } = setup();
    pointer(canvas, 'pointerdown', { x: 110, y: 60 });
    rerender({ canvas: null, enabled: false });
    expect(result.current.isDragging).toBe(false);
  });
});
