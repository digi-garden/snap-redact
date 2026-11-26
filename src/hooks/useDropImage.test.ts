// UT-HK-04〜06（docs/06-test-design.md 2.2）ほか
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDropImage } from './useDropImage';

/** jsdom の DragEvent は dataTransfer を受け取らないので、Event に dataTransfer を付けて送る */
function drag(type: string, init: { files?: File[]; types?: string[] } = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const files = init.files ?? [];
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: init.types ?? ['Files'], files, dropEffect: 'none' },
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

function setup(enabled = true) {
  const onImage = vi.fn();
  const onNoImage = vi.fn();
  const hook = renderHook(
    (props: { enabled: boolean }) => useDropImage({ enabled: props.enabled, onImage, onNoImage }),
    { initialProps: { enabled } },
  );
  return { ...hook, onImage, onNoImage };
}

const png = new File(['x'], 'a.png', { type: 'image/png' });

describe('useDropImage', () => {
  it('ファイルを重ねると強調表示、離れると消える', () => {
    const { result } = setup();
    drag('dragenter');
    expect(result.current.isOver).toBe(true);
    drag('dragleave');
    expect(result.current.isOver).toBe(false);
  });

  it('UT-HK-04：子要素の間を移動（enter → enter → leave）しても強調表示は消えない', () => {
    const { result } = setup();
    drag('dragenter');
    drag('dragenter');
    drag('dragleave');
    expect(result.current.isOver).toBe(true);
  });

  it('UT-HK-05：dragleave が来ないまま blur → 強調表示が消える', () => {
    const { result } = setup();
    drag('dragenter');
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(result.current.isOver).toBe(false);
  });

  it('UT-HK-06：ダイアログ表示中に重ねても強調表示が出ず、落としても読み込まない', () => {
    const { result, onImage } = setup(false);
    drag('dragenter');
    expect(result.current.isOver).toBe(false);
    const drop = drag('drop', { files: [png] });
    expect(drop.defaultPrevented).toBe(true); // ページを離れない
    expect(onImage).not.toHaveBeenCalled();
  });

  it('画像を落とすと読み込み、強調表示が消える', () => {
    const { result, onImage } = setup();
    drag('dragenter');
    const drop = drag('drop', { files: [new File(['t'], 't.txt', { type: 'text/plain' }), png] });
    expect(drop.defaultPrevented).toBe(true);
    expect(onImage).toHaveBeenCalledWith(png);
    expect(result.current.isOver).toBe(false);
  });

  it('画像以外だけを落とす → TS-01', () => {
    const { onImage, onNoImage } = setup();
    drag('drop', { files: [new File(['t'], 't.txt', { type: 'text/plain' })] });
    expect(onImage).not.toHaveBeenCalled();
    expect(onNoImage).toHaveBeenCalledTimes(1);
  });

  it('dragover の既定動作を常に止める（ブラウザが画像を開いてページを離れないように）', () => {
    setup();
    expect(drag('dragover').defaultPrevented).toBe(true);
  });

  it('文字列のドラッグ（Files を含まない）には反応しない', () => {
    const { result } = setup();
    drag('dragenter', { types: ['text/plain'] });
    expect(result.current.isOver).toBe(false);
  });

  it('dragend で強調表示が消える', () => {
    const { result } = setup();
    drag('dragenter');
    drag('dragend');
    expect(result.current.isOver).toBe(false);
  });
  it('dragover の dropEffect：受け付けるときは copy、ダイアログ表示中は none', () => {
    const { rerender } = setup();
    const over = drag('dragover');
    expect((over as DragEvent).dataTransfer?.dropEffect).toBe('copy');
    rerender({ enabled: false });
    const blocked = drag('dragover');
    expect((blocked as DragEvent).dataTransfer?.dropEffect).toBe('none');
  });

  it('タブが隠れる（visibilitychange で hidden）と強調表示が消える', () => {
    const { result } = setup();
    drag('dragenter');
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    spy.mockRestore();
    expect(result.current.isOver).toBe(false);
  });
});
