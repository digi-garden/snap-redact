import { messages } from '../messages';
import { focusRing } from './styles';
import { LogoIcon } from './icons';
import { NoNetworkBadge } from './NoNetworkBadge';

type Props = {
  compact: boolean;
  onOpenVerify: () => void;
};

/** ヘッダー（docs/01 の 3.1） */
export function Header({ compact, onOpenVerify }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <a
          href="https://circle-note.com/"
          className={`flex items-center gap-2.5 rounded text-zinc-100 no-underline ${focusRing}`}
        >
          <LogoIcon />
          <span className="text-base font-bold">{messages.appName}</span>
        </a>
        {!compact && <span className="truncate text-[13px] text-zinc-400">{messages.tagline}</span>}
      </div>
      <NoNetworkBadge compact={compact} onClick={onOpenVerify} />
    </header>
  );
}
