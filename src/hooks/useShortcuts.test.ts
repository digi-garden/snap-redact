// 判定そのものは shortcuts.test.ts（UT-KEY）。ここではイベントの購読と既定動作の扱いを確かめる。
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcuts } from './useShortcuts';

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

const base = { isModalOpen: false, isDragging: false, canUndo: true, canExport: true };

describe('useShortcuts', () => {
  it('登録した動作だけ実行し、既定動作を止める', () => {
    const modeMosaic = vi.fn();
    renderHook(() => useShortcuts({ ...base, handlers: { modeMosaic } }));
    expect(press('m').defaultPrevented).toBe(true);
    expect(modeMosaic).toHaveBeenCalledTimes(1);
  });

  it('登録していない動作（例：コピー）は既定動作を止めない', () => {
    renderHook(() => useShortcuts({ ...base, handlers: {} }));
    expect(press('c', { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('最新の状態で判定する（再購読しない）', () => {
    const undo = vi.fn();
    const { rerender } = renderHook(
      (props: { canUndo: boolean }) =>
        useShortcuts({ ...base, canUndo: props.canUndo, handlers: { undo } }),
      { initialProps: { canUndo: false } },
    );
    press('z', { ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
    rerender({ canUndo: true });
    press('z', { ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('アンマウントで購読を解除する', () => {
    const modeFill = vi.fn();
    const { unmount } = renderHook(() => useShortcuts({ ...base, handlers: { modeFill } }));
    unmount();
    press('b');
    expect(modeFill).not.toHaveBeenCalled();
  });
});
