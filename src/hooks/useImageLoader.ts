import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { isGif, isSupportedImageType } from '../lib/core/imageType';
import { exceedsLimit, MAX_EDGE } from '../lib/core/limits';
import type { EditorAction, EditorState } from '../lib/core/types';
import { decodeImage } from '../lib/browser/decodeImage';
import { prepareCanvas, releaseCanvas } from '../lib/canvas/prepareCanvas';
import { messages } from '../messages';
import type { ShowToast } from './useToast';

/** テストで差し替えられる依存（デコードと Canvas の用意） */
export type LoaderDeps = {
  decode: (file: Blob) => Promise<ImageBitmap | null>;
  prepare: (base: ImageBitmap, width: number, height: number) => HTMLCanvasElement | null;
};

const defaultDeps: LoaderDeps = { decode: decodeImage, prepare: prepareCanvas };

type Options = {
  editor: EditorState<ImageBitmap>;
  dispatch: Dispatch<EditorAction<ImageBitmap>>;
  showToast: ShowToast;
  deps?: LoaderDeps;
};

/**
 * 画像の読み込み（F-04、docs/02 の 3.4）と、表示用 Canvas・元画像の後片付け。
 * - 世代番号：時間のかかるデコードの後で、後から来た読み込みに追い越されていないか確かめる
 * - 描画できるかは新しい Canvas で先に確かめる。失敗しても編集中の画像はそのまま残る
 * - 差し替え確認（DL-01）は S7 で加える
 */
export function useImageLoader({ editor, dispatch, showToast, deps = defaultDeps }: Options) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const generation = useRef(0);

  // いま表示している元画像と Canvas（後片付けに使う。最新の値を ref に写す）
  const current = useRef<{ base: ImageBitmap | null; canvas: HTMLCanvasElement | null }>({
    base: null,
    canvas: null,
  });
  useEffect(() => {
    current.current = { base: editor.status === 'loaded' ? editor.base : null, canvas };
  }, [editor, canvas]);

  // 画面を閉じるときに解放する
  useEffect(
    () => () => {
      current.current.base?.close();
      if (current.current.canvas) releaseCanvas(current.current.canvas);
    },
    [],
  );

  const release = useCallback(() => {
    const { base, canvas: old } = current.current;
    base?.close();
    if (old) releaseCanvas(old);
  }, []);

  const load = useCallback(
    async (file: Blob) => {
      // 0. 世代番号
      generation.current += 1;
      const gen = generation.current;

      // 1. 形式チェック
      if (!isSupportedImageType(file.type)) {
        showToast('error', messages.toast.unsupported);
        return;
      }

      // 2. デコード
      const bitmap = await deps.decode(file);
      if (gen !== generation.current) {
        // 後から来た読み込みに追い越された。黙って捨てる
        bitmap?.close();
        return;
      }
      if (!bitmap) {
        showToast('error', messages.toast.decodeFailed);
        return;
      }

      // 3. サイズチェック
      const { width, height } = bitmap;
      if (exceedsLimit(width, height)) {
        bitmap.close();
        showToast('error', messages.toast.tooLarge(MAX_EDGE));
        return;
      }

      // 4. 描画できるかの確認（ここまで既存の状態には触れない）
      const prepared = deps.prepare(bitmap, width, height);
      if (!prepared) {
        bitmap.close();
        showToast('error', messages.toast.cannotProcess);
        return;
      }

      // 5. 差し替え確認（DL-01）は S7

      // 6. 読み込み：前の元画像と Canvas を解放してから差し替える
      release();
      dispatch({ type: 'LOAD', base: bitmap, width, height });
      setCanvas(prepared);
      current.current = { base: bitmap, canvas: prepared };
      if (isGif(file.type)) showToast('info', messages.toast.gifFirstFrame);
    },
    [deps, dispatch, release, showToast],
  );

  /** クリア（F-09）：状態を empty に戻し、元画像と Canvas を解放する */
  const clear = useCallback(() => {
    generation.current += 1; // 読み込み途中のものがあれば捨てる
    release();
    current.current = { base: null, canvas: null };
    setCanvas(null);
    dispatch({ type: 'CLEAR' });
  }, [dispatch, release]);

  return { canvas, load, clear };
}
