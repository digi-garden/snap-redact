import { messages } from '../messages';
import { ShieldIcon } from './icons';
import { focusRing } from './styles';

type Props = {
  compact: boolean;
  onClick: () => void;
};

/**
 * 通信ブロックのバッジ（UI-2、docs/01 の 3.1）。
 * 件数や「0」のような、動的に監視しているように見える表現は使わない。
 * 見た目は CircleNote の共通バッジ（cn-accent の文字と cn-accent-border の枠）に合わせる。
 */
export function NoNetworkBadge({ compact, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={messages.badge.tooltip}
      aria-haspopup="dialog"
      className={`inline-flex min-h-8 shrink-0 max-sm:min-h-11 pointer-coarse:min-h-11 items-center gap-1.5 rounded-full border border-cn-accent-border px-3 py-1.5 text-xs font-semibold text-cn-accent hover:bg-cn-accent/10 ${focusRing}`}
    >
      <ShieldIcon />
      {compact ? messages.badge.shortLabel : messages.badge.label}
    </button>
  );
}
