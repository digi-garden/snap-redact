import type { Mode } from '../lib/core/types';
import { messages, type KeyLabels } from '../messages';
import { FillIcon, MosaicIcon, TrashIcon, UndoIcon } from './icons';
import { keyHint, segmentButton, toolButton } from './styles';

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  canUndo: boolean;
  canClear: boolean;
  onUndo: () => void;
  onClear: () => void;
  keys: KeyLabels;
  showKeyHints: boolean;
};

/** ツールバー（docs/01 の 3.2）。クリアは誤操作を防ぐため右端に離す */
export function Toolbar({
  mode,
  onModeChange,
  canUndo,
  canClear,
  onUndo,
  onClear,
  keys,
  showKeyHints,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 sm:px-6">
      <div
        role="group"
        aria-label="塗り方"
        className="flex overflow-hidden rounded-md border border-zinc-700"
      >
        <button
          type="button"
          aria-pressed={mode === 'fill'}
          onClick={() => onModeChange('fill')}
          className={segmentButton(mode === 'fill')}
        >
          <FillIcon />
          {messages.toolbar.fill}
          {showKeyHints && <span className={keyHint}>B</span>}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'mosaic'}
          onClick={() => onModeChange('mosaic')}
          className={segmentButton(mode === 'mosaic')}
        >
          <MosaicIcon />
          {messages.toolbar.mosaic}
          {showKeyHints && <span className={keyHint}>M</span>}
        </button>
      </div>
      <div aria-hidden="true" className="mx-1 h-6 w-px bg-zinc-700" />
      <button
        type="button"
        disabled={!canUndo}
        onClick={onUndo}
        title={messages.toolbar.undoTooltip(keys)}
        className={toolButton}
      >
        <UndoIcon />
        {messages.toolbar.undo}
      </button>
      <button
        type="button"
        disabled={!canClear}
        onClick={onClear}
        className={`ml-auto ${toolButton}`}
      >
        <TrashIcon />
        {messages.toolbar.clear}
      </button>
    </div>
  );
}
