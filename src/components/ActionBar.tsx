import { messages, type KeyLabels } from '../messages';
import { CopyIcon, DownloadIcon } from './icons';
import { container, keyHint, primaryButton, secondaryButton } from './styles';

type Props = {
  canExport: boolean;
  /** 画像の大きさと操作件数（例：1920 × 1080 px ・ 操作 3 件）。未読み込みなら null */
  info: string | null;
  onCopy: () => void;
  onDownload: () => void;
  keys: KeyLabels;
  showKeyHints: boolean;
};

/** アクションバー（docs/01 の 3.4） */
export function ActionBar({ canExport, info, onCopy, onDownload, keys, showKeyHints }: Props) {
  return (
    <div className="shrink-0 border-t border-cn-border bg-cn-surface py-3">
      <div className={`${container} flex items-center justify-between gap-3`}>
        <button type="button" disabled={!canExport} onClick={onCopy} className={primaryButton}>
          <CopyIcon />
          {messages.actions.copy}
          {showKeyHints && <span className={keyHint}>{messages.actions.copyKey(keys)}</span>}
        </button>
        <span className="hidden text-xs text-cn-text-muted sm:inline">
          {info ?? messages.actions.notLoaded}
        </span>
        <button
          type="button"
          disabled={!canExport}
          onClick={onDownload}
          className={secondaryButton}
        >
          <DownloadIcon />
          {messages.actions.download}
        </button>
      </div>
    </div>
  );
}
