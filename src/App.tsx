import { useState } from 'react';
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
import type { Mode } from './lib/core/types';

/**
 * 画面全体（docs/01-screen-design.md 2章）。
 * S4 は骨組みだけ：画像の読み込み・編集・出力は S5 以降でつなぐ。
 * mode は S5 で editorReducer に移す。
 */
export function App() {
  const { keys, mobileLike } = usePlatform();
  const [mode, setMode] = useState<Mode>('fill');
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
        mode={mode}
        onModeChange={setMode}
        canUndo={false}
        canClear={false}
        onUndo={noop}
        onClear={noop}
        keys={keys}
        showKeyHints={!mobileLike}
      />
      {mode === 'mosaic' && <MosaicNotice />}
      <CanvasStage>
        <EmptyState keys={keys} mobileLike={mobileLike} onFile={noop} />
      </CanvasStage>
      <ActionBar
        canExport={false}
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
