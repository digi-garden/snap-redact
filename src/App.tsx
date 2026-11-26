import { useCallback, useReducer, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { CanvasStage } from './components/CanvasStage';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileNotice } from './components/MobileNotice';
import { MosaicNotice } from './components/MosaicNotice';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { VerifyDialog } from './components/VerifyDialog';
import { useImageLoader } from './hooks/useImageLoader';
import { usePasteImage } from './hooks/usePasteImage';
import { usePlatform } from './hooks/usePlatform';
import { useToast } from './hooks/useToast';
import { editorReducer, initialEditorState } from './lib/core/editorReducer';
import { acceptsInput, canExport, canUndo } from './lib/core/selectors';
import { messages } from './messages';

/**
 * 画面全体（docs/01-screen-design.md 2章）。
 * 編集状態は editorReducer で持つ（docs/02 の 2.2）。
 * S6：貼り付けとファイル選択で読み込める。ドロップと差し替え確認は S7、編集は S8 以降、出力は S11。
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

  const inputEnabled = acceptsInput({ isModalOpen: verifyOpen, isDragging: false });
  usePasteImage({ enabled: inputEnabled, onImage: loadFile, onNoImage: notifyNoImage });

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
        canvas={loader.canvas}
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
      <VerifyDialog open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
