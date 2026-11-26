import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { isGif, isSupportedImageType } from '../lib/core/imageType';
import { exceedsLimit, MAX_EDGE } from '../lib/core/limits';
import { needsReplaceConfirm } from '../lib/core/selectors';
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

/** 描画まで済ませた、読み込み直前の画像 */
type Prepared = {
  base: ImageBitmap;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  gif: boolean;
};

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
 * - 未保存の編集があるときは、差し替え待ち（pending）にして確認（DL-01）を待つ（IN-5）
 */
export function useImageLoader({ editor, dispatch, showToast, deps = defaultDeps }: Options) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pending, setPending] = useState<Prepared | null>(null);
  const generation = useRef(0);

  // 最新の状態を ref に写す（非同期の処理の後で使う。描画中には書き換えない）
  const latest = useRef({
    editor,
    canvas: null as HTMLCanvasElement | null,
    pending: null as Prepared | null,
  });
  useEffect(() => {
    latest.current = { editor, canvas, pending };
  }, [editor, canvas, pending]);

  // 画面を閉じるときに、表示中と差し替え待ちの画像を解放する
  useEffect(
    () => () => {
      const { editor: e, canvas: c, pending: p } = latest.current;
      if (e.status === 'loaded') e.base.close();
      if (c) releaseCanvas(c);
      if (p) discard(p);
    },
    [],
  );

  /** 表示中の元画像と Canvas を解放する */
  const releaseCurrent = useCallback(() => {
    const { editor: e, canvas: c } = latest.current;
    if (e.status === 'loaded') e.base.close();
    if (c) releaseCanvas(c);
  }, []);

  /** 用意した画像で差し替える（docs/02 の 3.4 手順6） */
  const commit = useCallback(
    (next: Prepared) => {
      releaseCurrent();
      dispatch({ type: 'LOAD', base: next.base, width: next.width, height: next.height });
      setCanvas(next.canvas);
      latest.current = {
        editor: {
          status: 'loaded',
          mode: latest.current.editor.mode,
          base: next.base,
          width: next.width,
          height: next.height,
          ops: [],
          unsaved: false,
        },
        canvas: next.canvas,
        pending: null,
      };
      if (next.gif) showToast('info', messages.toast.gifFirstFrame);
    },
    [dispatch, releaseCurrent, showToast],
  );

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
      const next: Prepared = {
        base: bitmap,
        width,
        height,
        canvas: prepared,
        gif: isGif(file.type),
      };

      // 5. 差し替え確認：未保存の編集があれば DL-01 を待つ（すでに待っているものがあれば捨てて置き換える）
      if (needsReplaceConfirm(latest.current.editor)) {
        const old = latest.current.pending;
        if (old) discard(old);
        latest.current = { ...latest.current, pending: next };
        setPending(next);
        return;
      }

      // 6. 読み込み
      commit(next);
    },
    [commit, deps, showToast],
  );

  /** DL-01 で「差し替える」 */
  const confirmReplace = useCallback(() => {
    const next = latest.current.pending;
    if (!next) return;
    setPending(null);
    commit(next);
  }, [commit]);

  /** DL-01 で「キャンセル」（Esc・背景クリックも同じ） */
  const cancelReplace = useCallback(() => {
    const next = latest.current.pending;
    if (!next) return;
    discard(next);
    latest.current = { ...latest.current, pending: null };
    setPending(null);
  }, []);

  /** クリア（F-09）：状態を empty に戻し、元画像と Canvas を解放する */
  const clear = useCallback(() => {
    generation.current += 1; // 読み込み途中のものがあれば捨てる
    releaseCurrent();
    const { editor: e, pending: p } = latest.current;
    if (p) discard(p);
    // 再描画を待たずに ref も empty にする（直後に終わった読み込みが古い状態を見ないように）
    latest.current = { editor: { status: 'empty', mode: e.mode }, canvas: null, pending: null };
    setCanvas(null);
    setPending(null);
    dispatch({ type: 'CLEAR' });
  }, [dispatch, releaseCurrent]);

  return {
    canvas,
    load,
    clear,
    /** 差し替え確認（DL-01）を出すべきか */
    replacePending: pending !== null,
    confirmReplace,
    cancelReplace,
  };
}

/** 差し替え待ちの画像を捨てる */
function discard(p: Prepared) {
  p.base.close();
  releaseCanvas(p.canvas);
}
