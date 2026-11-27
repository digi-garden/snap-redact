import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { CanvasStage } from './components/CanvasStage';
import { ConfirmReplaceDialog } from './components/ConfirmReplaceDialog';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileNotice } from './components/MobileNotice';
import { MosaicNotice } from './components/MosaicNotice';
import { SelectionOverlay } from './components/SelectionOverlay';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { UsageGuide } from './components/UsageGuide';
import { VerifyDialog } from './components/VerifyDialog';
import { useDropImage } from './hooks/useDropImage';
import { useImageLoader } from './hooks/useImageLoader';
import { usePasteImage } from './hooks/usePasteImage';
import { usePlatform } from './hooks/usePlatform';
import { useRectDrag } from './hooks/useRectDrag';
import { useShortcuts } from './hooks/useShortcuts';
import { useToast } from './hooks/useToast';
import { editorReducer, initialEditorState } from './lib/core/editorReducer';
import { mosaicBlockSize } from './lib/core/mosaicBlock';
import { acceptsInput, canExport, canUndo } from './lib/core/selectors';
import type { Op, Rect } from './lib/core/types';
import { applyOp } from './lib/canvas/applyOp';
import { renderAll } from './lib/canvas/renderAll';
import { releaseCanvas } from './lib/canvas/prepareCanvas';
import { copyImage } from './lib/browser/copyImage';
import { downloadImage } from './lib/browser/downloadImage';
import { messages } from './messages';

/**
 * 画面全体（docs/01-screen-design.md 2章）。
 * 編集状態は editorReducer で持つ（docs/02 の 2.2）。
 * 読み込み（貼り付け・ファイル選択・ドロップ、差し替えの確認）、矩形の黒塗り・モザイク、元に戻す・クリア、
 * コピー・ダウンロード、キー操作（B・M・Esc・Ctrl+Z・Ctrl+C）。
 */
export function App() {
  const { keys, mobileLike } = usePlatform();
  const [editor, dispatch] = useReducer(
    editorReducer<ImageBitmap>,
    undefined,
    initialEditorState<ImageBitmap>,
  );
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [mobileNoticeClosed, setMobileNoticeClosed] = useState(false);
  const { toast, showToast, dismiss } = useToast();
  const loader = useImageLoader({ editor, dispatch, showToast });

  // 読み込みは非同期。結果はトーストと状態で伝えるので、Promise は待たない
  const loadFile = useCallback((file: Blob) => void loader.load(file), [loader]);
  const notifyNoImage = useCallback(() => showToast('error', messages.toast.noImage), [showToast]);

  const isModalOpen = verifyOpen || loader.replacePending;

  // 矩形を確定したら、その操作だけを描き、描けたら記録する（docs/02 の 3.6）
  const work = useRef<HTMLCanvasElement | null>(null); // モザイク用の作業 Canvas（1枚を使い回す）
  /** 作業用 Canvas を解放する（クリア・アンマウント。次に使うときに作り直す） */
  const releaseWork = useCallback(() => {
    if (work.current) releaseCanvas(work.current);
    work.current = null;
  }, []);
  useEffect(() => releaseWork, [releaseWork]);
  const { canvas } = loader;
  const commitRect = useCallback(
    (rect: Rect) => {
      if (!canvas || editor.status !== 'loaded') return;
      const op: Op =
        editor.mode === 'fill'
          ? { kind: 'fill', rect }
          : { kind: 'mosaic', rect, blockSize: mosaicBlockSize(editor.width, editor.height) };
      const ctx = canvas.getContext('2d');
      work.current ??= document.createElement('canvas');
      // 描けなかった操作は記録しない（隠れていないのに「隠した」履歴が残らないように）
      if (!ctx || !applyOp(ctx, op, work.current)) {
        showToast('error', messages.toast.cannotProcess);
        return;
      }
      dispatch({ type: 'ADD_OP', op });
    },
    [canvas, editor, showToast],
  );
  const rectDrag = useRectDrag({
    canvas,
    width: editor.status === 'loaded' ? editor.width : 0,
    height: editor.status === 'loaded' ? editor.height : 0,
    enabled: editor.status === 'loaded' && !isModalOpen,
    onCommit: commitRect,
  });

  const { isDragging } = rectDrag;
  const inputEnabled = acceptsInput({ isModalOpen, isDragging });

  // 元に戻す（docs/02 の 3.9）：最後の操作を除いて、元画像から全体を描き直す
  const undo = useCallback(() => {
    if (!canvas || editor.status !== 'loaded' || editor.ops.length === 0 || isDragging) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('error', messages.toast.cannotProcess);
      return;
    }
    work.current ??= document.createElement('canvas');
    const ops = editor.ops.slice(0, -1);
    try {
      const started = import.meta.env.DEV ? performance.now() : 0;
      const ok = renderAll(ctx, editor.base, ops, work.current);
      if (import.meta.env.DEV) {
        // 開発ビルドだけ計測する（02 の 6章。4K・操作 20 件で 100ms を超えたら対策を検討）
        console.debug(
          `[snap-redact] renderAll ${editor.width}×${editor.height}, ops ${ops.length}: ${(performance.now() - started).toFixed(1)}ms`,
        );
      }
      // モザイクが描けず黒で代わりに塗ったときも、隠れてはいるので Undo は確定する
      if (!ok) showToast('error', messages.toast.cannotProcess);
    } catch {
      // 元画像が描けない：clearRect 済みなので画面は空になり、隠すべき内容は見えない
      showToast('error', messages.toast.cannotProcess);
    }
    dispatch({ type: 'UNDO' });
  }, [canvas, editor, isDragging, showToast]);

  // クリア（docs/02 の 3.10）：ドラッグ中は何もしない
  const clear = useCallback(() => {
    if (isDragging) return;
    loader.clear();
    releaseWork();
  }, [isDragging, loader, releaseWork]);

  // コピー（docs/02 の 3.11）：ボタンのクリック・Ctrl+C の keydown の中で、await を挟まずに copyImage を呼ぶ
  // toBlob は呼んだ時点の画素を書き出す。完了前に編集されてもよいよう、開始時点の ops を EXPORTED に渡す
  const copy = useCallback(() => {
    if (!canvas || editor.status !== 'loaded' || isDragging) return;
    const { ops } = editor;
    void copyImage(canvas).then((result) => {
      if (result === 'ok') {
        dispatch({ type: 'EXPORTED', ops });
        showToast('success', messages.toast.copied);
      } else {
        showToast('error', messages.toast.copyFailed);
      }
    });
  }, [canvas, editor, isDragging, showToast]);

  // ダウンロード（docs/02 の 3.12）
  const download = useCallback(() => {
    if (!canvas || editor.status !== 'loaded' || isDragging) return;
    const { ops } = editor;
    void downloadImage(canvas).then((result) => {
      if (result === 'ok') {
        dispatch({ type: 'EXPORTED', ops });
        showToast('success', messages.toast.downloaded);
      } else {
        showToast('error', messages.toast.cannotProcess);
      }
    });
  }, [canvas, editor, isDragging, showToast]);

  // キー操作（docs/02 の 4章）
  useShortcuts({
    isModalOpen,
    isDragging,
    canUndo: canUndo(editor),
    canExport: canExport(editor),
    handlers: {
      cancelDrag: rectDrag.cancel,
      undo,
      copy,
      modeFill: () => dispatch({ type: 'SET_MODE', mode: 'fill' }),
      modeMosaic: () => dispatch({ type: 'SET_MODE', mode: 'mosaic' }),
    },
  });
  usePasteImage({ enabled: inputEnabled, onImage: loadFile, onNoImage: notifyNoImage });
  const { isOver } = useDropImage({
    enabled: inputEnabled,
    onImage: loadFile,
    onNoImage: notifyNoImage,
  });

  return (
    <>
      {/* 編集の画面は画面の高さいっぱい（UI-4）。用途・使い方とフッターは、スクロールした先に置く */}
      <div className="flex h-dvh flex-col overflow-hidden">
        <Header compact={mobileLike} onOpenVerify={() => setVerifyOpen(true)} />
        {mobileLike && !mobileNoticeClosed && (
          <MobileNotice onClose={() => setMobileNoticeClosed(true)} />
        )}
        <Toolbar
          mode={editor.mode}
          onModeChange={(mode) => dispatch({ type: 'SET_MODE', mode })}
          canUndo={canUndo(editor)}
          canClear={canExport(editor)}
          onUndo={undo}
          onClear={clear}
          keys={keys}
          showKeyHints={!mobileLike}
        />
        {editor.mode === 'mosaic' && <MosaicNotice />}
        <CanvasStage
          canvas={canvas}
          dropping={isOver}
          selection={
            canvas &&
            rectDrag.rect &&
            editor.status === 'loaded' && (
              <SelectionOverlay
                canvas={canvas}
                rect={rectDrag.rect}
                width={editor.width}
                height={editor.height}
                mode={editor.mode}
              />
            )
          }
          empty={<EmptyState keys={keys} mobileLike={mobileLike} onFile={loadFile} />}
        />
        <ActionBar
          canExport={canExport(editor)}
          info={
            editor.status === 'loaded'
              ? messages.imageInfo(editor.width, editor.height, editor.ops.length)
              : null
          }
          onCopy={copy}
          onDownload={download}
          keys={keys}
          showKeyHints={!mobileLike}
        />
      </div>
      <UsageGuide keys={keys} />
      <Footer />
      <Toast toast={toast} onDismiss={dismiss} />
      <ConfirmReplaceDialog
        open={loader.replacePending}
        onCancel={loader.cancelReplace}
        onConfirm={loader.confirmReplace}
      />
      <VerifyDialog open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </>
  );
}
