import { messages } from '../messages';
import { NoNetworkBadge } from './NoNetworkBadge';
import { container, focusRing } from './styles';

type Props = {
  compact: boolean;
  onOpenVerify: () => void;
};

/**
 * ヘッダー（docs/01 の 3.1）。CircleNote の共通シェル（brand-assets の CircleNoteHeader）に合わせる：
 * 左に「CircleNote / ツール名（h1）」と1行の説明、右にバッジ。
 * バッジは共通の見た目にそろえつつ、押すと確かめ方（DL-02）が開く Snap-Redact の機能を残す。
 */
export function Header({ compact, onOpenVerify }: Props) {
  return (
    <header className="shrink-0 border-b border-cn-border bg-cn-bg py-3 sm:py-4">
      <div className={`${container} flex flex-wrap items-center justify-between gap-x-5 gap-y-2`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://circle-note.com/"
              className={`rounded-sm font-semibold text-cn-text hover:text-cn-link ${focusRing}`}
            >
              {messages.brand}
            </a>
            <span className="text-cn-border-strong" aria-hidden="true">
              /
            </span>
            <h1 className="text-base font-semibold text-cn-text">{messages.appName}</h1>
          </div>
          {!compact && <p className="mt-0.5 text-xs text-cn-text-muted">{messages.tagline}</p>}
        </div>
        <NoNetworkBadge compact={compact} onClick={onOpenVerify} />
      </div>
    </header>
  );
}
