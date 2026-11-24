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
 */
export function NoNetworkBadge({ compact, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={messages.badge.tooltip}
      aria-haspopup="dialog"
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-emerald-500 px-3 py-1.5 text-[13px] text-emerald-400 hover:bg-emerald-500/10 ${focusRing}`}
    >
      <ShieldIcon />
      {compact ? messages.badge.shortLabel : messages.badge.label}
    </button>
  );
}
