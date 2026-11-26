import { useCallback, useReducer, useRef, useState } from 'react';
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
import { VerifyDialog } from './components/VerifyDialog';
import { useDropImage } from './hooks/useDropImage';
import { useImageLoader } from './hooks/useImageLoader';
import { usePasteImage } from './hooks/usePasteImage';
import { usePlatform } from './hooks/usePlatform';
import { useRectDrag } from './hooks/useRectDrag';
import { useToast } from './hooks/useToast';
import { editorReducer, initialEditorState } from './lib/core/editorReducer';
import { acceptsInput, canExport, canUndo } from './lib/core/selectors';
import type { Op, Rect } from './lib/core/types';
import { applyOp } from './lib/canvas/applyOp';
import { messages } from './messages';

/**
 * 画面全体（docs/01-screen-design.md 2章）。
 * 編集状態は editorReducer で持つ（docs/02 の 2.2）。
 * S8 まで：読み込み（貼り付け・ファイル選択・ドロップ、差し替えの確認）と、矩形の黒塗り。
 * モザイクの描画は S9、Undo の描き直しは S10、出力は S11。
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

  // 矩形を確定したら、操作を記録して、その操作だけを描く（docs/02 の 3.6）
  const work = useRef<HTMLCanvasElement | null>(null); // モザイク用の作業 Canvas（1枚を使い回す）
  const { canvas } = loader;
  const commitRect = useCallback(
    (rect: Rect) => {
      if (!canvas || editor.status !== 'loaded') return;
      if (editor.mode !== 'fill') return; // モザイクは S9 で描けるようにする
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('error', messages.toast.cannotProcess);
        return;
      }
      work.current ??= document.createElement('canvas');
      const op: Op = { kind: 'fill', rect };
      dispatch({ type: 'ADD_OP', op });
      applyOp(ctx, op, work.current);
    },
    [canvas, editor.status, editor.mode, showToast],
  );
  const rectDrag = useRectDrag({
    canvas,
    width: editor.status === 'loaded' ? editor.width : 0,
    height: editor.status === 'loaded' ? editor.height : 0,
    enabled: editor.status === 'loaded' && !isModalOpen,
    onCommit: commitRect,
  });

  const inputEnabled = acceptsInput({ isModalOpen, isDragging: rectDrag.isDragging });
  usePasteImage({ enabled: inputEnabled, onImage: loadFile, onNoImage: notifyNoImage });
  const { isOver } = useDropImage({
    enabled: inputEnabled,
    onImage: loadFile,
    onNoImage: notifyNoImage,
  });

  const noop = () => undefined;

  return (
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
        onUndo={() => dispatch({ type: 'UNDO' })}
        onClear={loader.clear}
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
        onCopy={noop}
        onDownload={noop}
        keys={keys}
        showKeyHints={!mobileLike}
      />
      <Footer />
      <Toast toast={toast} onDismiss={dismiss} />
      <ConfirmReplaceDialog
        open={loader.replacePending}
        onCancel={loader.cancelReplace}
        onConfirm={loader.confirmReplace}
      />
      <VerifyDialog open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
