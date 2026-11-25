import { messages } from '../messages';
import { CloseIcon } from './icons';
import { focusRing } from './styles';

type Props = {
  onClose: () => void;
};

/** NT-02：スマホ向けの案内（UI-6、docs/01 の 5.2・8章）。閉じた状態は保存しない */
export function MobileNotice({ onClose }: Props) {
  return (
    <div
      role="note"
      className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-stone-900 py-1 pr-1 pl-4 text-[13px] text-amber-400"
    >
      <span>{messages.mobileNotice}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={messages.mobileNoticeClose}
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-200 ${focusRing}`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
