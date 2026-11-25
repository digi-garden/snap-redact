import { useReducer, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { CanvasStage } from './components/CanvasStage';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileNotice } from './components/MobileNotice';
import { MosaicNotice } from './components/MosaicNotice';
import { Toolbar } from './components/Toolbar';
import { VerifyDialog } from './components/VerifyDialog';
import { usePlatform } from './hooks/usePlatform';
import { editorReducer, initialEditorState } from './lib/core/editorReducer';
import { canExport, canUndo } from './lib/core/selectors';

/**
 * 画面全体（docs/01-screen-design.md 2章）。
 * 編集状態は editorReducer で持つ（docs/02 の 2.2）。画像の読み込み・編集・出力は S6 以降でつなぐ。
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
        onClear={() => dispatch({ type: 'CLEAR' })}
        keys={keys}
        showKeyHints={!mobileLike}
      />
      {editor.mode === 'mosaic' && <MosaicNotice />}
      <CanvasStage>
        <EmptyState keys={keys} mobileLike={mobileLike} onFile={noop} />
      </CanvasStage>
      <ActionBar
        canExport={canExport(editor)}
        info={null}
        onCopy={noop}
        onDownload={noop}
        keys={keys}
        showKeyHints={!mobileLike}
      />
      <Footer />
      <VerifyDialog open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
