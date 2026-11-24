import { messages } from '../messages';
import { WarningIcon } from './icons';

/** NT-01：モザイク選択中の注意文（ED-4、docs/01 の 5.2） */
export function MosaicNotice() {
  return (
    <div
      role="note"
      className="flex min-h-8 shrink-0 items-center gap-2 border-b border-zinc-800 bg-stone-900 px-4 py-1 text-[13px] text-amber-400 sm:px-6"
    >
      <WarningIcon />
      {messages.mosaicNotice}
    </div>
  );
}
