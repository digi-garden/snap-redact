// UT-HK-01・UT-HK-08（docs/06-test-design.md 2.2）ほか
// デコードと Canvas の用意を偽物に差し替えて、読み込みの順番や失敗を制御する。
import { act, renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { editorReducer, initialEditorState } from '../lib/core/editorReducer';
import { MAX_EDGE } from '../lib/core/limits';
import { messages } from '../messages';
import { useImageLoader, type LoaderDeps } from './useImageLoader';

type FakeBitmap = ImageBitmap & { close: ReturnType<typeof vi.fn> };
const bitmap = (width: number, height: number) =>
  ({ width, height, close: vi.fn() }) as unknown as FakeBitmap;
const canvasEl = () => ({ width: 1, height: 1 }) as unknown as HTMLCanvasElement;
const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });

/** 結果を外から決められる Promise */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setup(deps: LoaderDeps) {
  const showToast = vi.fn();
  const hook = renderHook(() => {
    const [editor, dispatch] = useReducer(
      editorReducer<ImageBitmap>,
      undefined,
      initialEditorState<ImageBitmap>,
    );
    const loader = useImageLoader({ editor, dispatch, showToast, deps });
    return { editor, dispatch, ...loader };
  });
  return { ...hook, showToast };
}

describe('useImageLoader', () => {
  it('読み込むと loaded になり、用意した Canvas が表示用になる', async () => {
    const b = bitmap(100, 50);
    const c = canvasEl();
    const { result } = setup({ decode: () => Promise.resolve(b), prepare: () => c });
    await act(() => result.current.load(png()));
    expect(result.current.editor).toMatchObject({
      status: 'loaded',
      base: b,
      width: 100,
      height: 50,
    });
    expect(result.current.canvas).toBe(c);
  });

  it('UT-HK-01：遅い読み込み A の後に速い読み込み B → B が表示され、A は close() される', async () => {
    const a = bitmap(10, 10);
    const b = bitmap(20, 20);
    const slow = deferred<ImageBitmap | null>();
    const decode = vi.fn((file: Blob) =>
      (file as File).name === 'a.png' ? slow.promise : Promise.resolve(b as ImageBitmap),
    );
    const { result } = setup({ decode, prepare: () => canvasEl() });

    let first!: Promise<void>;
    act(() => {
      first = result.current.load(png('a.png'));
    });
    await act(() => result.current.load(png('b.png')));
    await act(async () => {
      slow.resolve(a);
      await first;
    });

    expect(result.current.editor).toMatchObject({ status: 'loaded', base: b });
    expect(a.close).toHaveBeenCalledTimes(1);
    expect(b.close).not.toHaveBeenCalled();
  });

  it('UT-HK-08：編集中に読み込んだ画像の Canvas が用意できない → TS-05、編集中の状態は変わらず、新しい画像は close()', async () => {
    const first = bitmap(100, 100);
    const second = bitmap(200, 100); // 上限内だが、Canvas が用意できない画像
    const firstCanvas = canvasEl();
    const prepare = vi.fn((base: ImageBitmap) => (base === first ? firstCanvas : null));
    const decode = vi.fn((file: Blob) =>
      Promise.resolve((file as File).name === 'first.png' ? first : second),
    );
    const { result, showToast } = setup({ decode, prepare });

    await act(() => result.current.load(png('first.png')));
    const before = result.current.editor;
    await act(() => result.current.load(png('second.png')));

    expect(showToast).toHaveBeenLastCalledWith('error', messages.toast.cannotProcess);
    expect(result.current.editor).toBe(before);
    expect(result.current.canvas).toBe(firstCanvas);
    expect(second.close).toHaveBeenCalledTimes(1);
    expect(first.close).not.toHaveBeenCalled();
  });

  it('差し替えると前の元画像を close() し、前の Canvas を 0×0 に戻す', async () => {
    const a = bitmap(10, 10);
    const b = bitmap(20, 20);
    const ca = canvasEl();
    const decode = vi.fn((file: Blob) => Promise.resolve((file as File).name === 'a.png' ? a : b));
    const prepare = vi.fn((base: ImageBitmap) => (base === a ? ca : canvasEl()));
    const { result } = setup({ decode, prepare });

    await act(() => result.current.load(png('a.png')));
    await act(() => result.current.load(png('b.png')));

    expect(a.close).toHaveBeenCalledTimes(1);
    expect([ca.width, ca.height]).toEqual([0, 0]);
  });

  it('非対応の形式 → TS-02、デコードしない', async () => {
    const decode = vi.fn();
    const { result, showToast } = setup({ decode, prepare: vi.fn() });
    await act(() => result.current.load(new File(['x'], 'a.bmp', { type: 'image/bmp' })));
    expect(showToast).toHaveBeenCalledWith('error', messages.toast.unsupported);
    expect(decode).not.toHaveBeenCalled();
  });

  it('デコードに失敗 → TS-03', async () => {
    const { result, showToast } = setup({ decode: () => Promise.resolve(null), prepare: vi.fn() });
    await act(() => result.current.load(png()));
    expect(showToast).toHaveBeenCalledWith('error', messages.toast.decodeFailed);
    expect(result.current.editor.status).toBe('empty');
  });

  it('上限を超える → TS-04、close() する', async () => {
    const big = bitmap(MAX_EDGE + 1, 10);
    const prepare = vi.fn();
    const { result, showToast } = setup({ decode: () => Promise.resolve(big), prepare });
    await act(() => result.current.load(png()));
    expect(showToast).toHaveBeenCalledWith('error', messages.toast.tooLarge(MAX_EDGE));
    expect(big.close).toHaveBeenCalledTimes(1);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('GIF → 読み込んだうえで TS-09', async () => {
    const { result, showToast } = setup({
      decode: () => Promise.resolve(bitmap(10, 10)),
      prepare: () => canvasEl(),
    });
    await act(() => result.current.load(new File(['x'], 'a.gif', { type: 'image/gif' })));
    expect(result.current.editor.status).toBe('loaded');
    expect(showToast).toHaveBeenCalledWith('info', messages.toast.gifFirstFrame);
  });

  it('クリアで empty に戻し、元画像を close()、Canvas を 0×0 に戻す', async () => {
    const b = bitmap(10, 10);
    const c = canvasEl();
    const { result } = setup({ decode: () => Promise.resolve(b), prepare: () => c });
    await act(() => result.current.load(png()));
    act(() => result.current.clear());
    expect(result.current.editor.status).toBe('empty');
    expect(result.current.canvas).toBe(null);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect([c.width, c.height]).toEqual([0, 0]);
  });

  it('デコード中にクリア → 後から届いた画像は close() し、empty のまま', async () => {
    const b = bitmap(10, 10);
    const slow = deferred<ImageBitmap | null>();
    const { result, showToast } = setup({ decode: () => slow.promise, prepare: () => canvasEl() });
    let loading!: Promise<void>;
    act(() => {
      loading = result.current.load(png());
    });
    act(() => result.current.clear());
    await act(async () => {
      slow.resolve(b);
      await loading;
    });
    expect(result.current.editor.status).toBe('empty');
    expect(result.current.canvas).toBe(null);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('デコード失敗が届く前に別の画像に追い越された → TS-03 は出さない', async () => {
    const b = bitmap(20, 20);
    const slow = deferred<ImageBitmap | null>();
    const decode = vi.fn((file: Blob) =>
      (file as File).name === 'a.png' ? slow.promise : Promise.resolve(b as ImageBitmap),
    );
    const { result, showToast } = setup({ decode, prepare: () => canvasEl() });
    let first!: Promise<void>;
    act(() => {
      first = result.current.load(png('a.png'));
    });
    await act(() => result.current.load(png('b.png')));
    await act(async () => {
      slow.resolve(null);
      await first;
    });
    expect(result.current.editor).toMatchObject({ status: 'loaded', base: b });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('画面を閉じる（アンマウント）と元画像を close() する', async () => {
    const b = bitmap(10, 10);
    const { result, unmount } = setup({
      decode: () => Promise.resolve(b),
      prepare: () => canvasEl(),
    });
    await act(() => result.current.load(png()));
    unmount();
    expect(b.close).toHaveBeenCalledTimes(1);
  });

  describe('差し替え確認（DL-01、IN-5）', () => {
    const fillOp = { kind: 'fill', rect: { x: 0, y: 0, w: 5, h: 5 } } as const;

    /** 1枚目を読み込み、未保存の操作を1件入れた状態にする */
    async function editedSetup() {
      const a = bitmap(10, 10);
      const b = bitmap(20, 20);
      const ca = canvasEl();
      const cb = canvasEl();
      const decode = vi.fn((file: Blob) =>
        Promise.resolve((file as File).name === 'a.png' ? a : b),
      );
      const prepare = vi.fn((base: ImageBitmap) => (base === a ? ca : cb));
      const ctx = setup({ decode, prepare });
      await act(() => ctx.result.current.load(png('a.png')));
      act(() => ctx.result.current.dispatch({ type: 'ADD_OP', op: fillOp }));
      return { ...ctx, a, b, ca, cb };
    }

    it('UT-HK-02：未保存の編集があるときに読み込む → 差し替え待ちになり、まだ LOAD されない', async () => {
      const { result, a } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      expect(result.current.replacePending).toBe(true);
      expect(result.current.editor).toMatchObject({ base: a, ops: [fillOp], unsaved: true });
    });

    it('UT-HK-03：キャンセル → 差し替え待ちの画像を close()・Canvas を解放、状態は変わらない', async () => {
      const { result, a, b, ca, cb } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      const before = result.current.editor;
      act(() => result.current.cancelReplace());
      expect(result.current.replacePending).toBe(false);
      expect(result.current.editor).toBe(before);
      expect(result.current.canvas).toBe(ca);
      expect(b.close).toHaveBeenCalledTimes(1);
      expect([cb.width, cb.height]).toEqual([0, 0]);
      expect(a.close).not.toHaveBeenCalled();
    });

    it('UT-HK-07：「差し替える」 → LOAD され、新しい Canvas が表示用になり、前の画像は close()', async () => {
      const { result, a, b, ca, cb } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      act(() => result.current.confirmReplace());
      expect(result.current.replacePending).toBe(false);
      expect(result.current.editor).toMatchObject({ base: b, ops: [], unsaved: false });
      expect(result.current.canvas).toBe(cb);
      expect(a.close).toHaveBeenCalledTimes(1);
      expect([ca.width, ca.height]).toEqual([0, 0]);
      expect(b.close).not.toHaveBeenCalled();
    });

    it('保存済み（EXPORTED の後）なら確認せずに差し替える', async () => {
      const { result, b } = await editedSetup();
      const { editor } = result.current;
      const ops = editor.status === 'loaded' ? editor.ops : [];
      act(() => result.current.dispatch({ type: 'EXPORTED', ops }));
      await act(() => result.current.load(png('b.png')));
      expect(result.current.replacePending).toBe(false);
      expect(result.current.editor).toMatchObject({ base: b });
    });

    it('キャンセルを2回呼んでも close() は1回だけ（Esc の二重処理への備え）', async () => {
      const { result, b } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      act(() => {
        result.current.cancelReplace();
        result.current.cancelReplace();
      });
      expect(b.close).toHaveBeenCalledTimes(1);
    });

    it('クリアの直後（再描画の前）に読み込みが終わる → 確認を出さずに読み込み、前の画像の close() は1回だけ', async () => {
      const { result, a, b } = await editedSetup();
      await act(async () => {
        result.current.clear();
        await result.current.load(png('b.png'));
      });
      expect(result.current.replacePending).toBe(false);
      expect(result.current.editor).toMatchObject({ status: 'loaded', base: b, ops: [] });
      expect(a.close).toHaveBeenCalledTimes(1);
    });

    it('差し替え待ちのときにクリア → 差し替え待ちの画像も close()・Canvas を解放', async () => {
      const { result, a, b, cb } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      act(() => result.current.clear());
      expect(result.current.replacePending).toBe(false);
      expect(result.current.editor.status).toBe('empty');
      expect(a.close).toHaveBeenCalledTimes(1);
      expect(b.close).toHaveBeenCalledTimes(1);
      expect([cb.width, cb.height]).toEqual([0, 0]);
    });

    it('差し替え待ちのままアンマウント → 差し替え待ちの画像も close()', async () => {
      const { result, unmount, a, b } = await editedSetup();
      await act(() => result.current.load(png('b.png')));
      unmount();
      expect(a.close).toHaveBeenCalledTimes(1);
      expect(b.close).toHaveBeenCalledTimes(1);
    });
  });
});
