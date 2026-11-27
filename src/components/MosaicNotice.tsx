import { messages } from '../messages';
import { WarningIcon } from './icons';
import { container } from './styles';

/** NT-01：モザイク選択中の注意文（ED-4、docs/01 の 5.2） */
export function MosaicNotice() {
  return (
    <div
      role="note"
      className="shrink-0 border-b border-cn-border bg-cn-surface py-1 text-[13px] text-cn-warning"
    >
      <div className={`${container} flex min-h-6 items-center gap-2`}>
        <WarningIcon />
        {messages.mosaicNotice}
      </div>
    </div>
  );
}
