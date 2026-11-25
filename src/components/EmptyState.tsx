import { useRef } from 'react';
import { messages, type KeyLabels } from '../messages';
import { ImageIcon } from './icons';
import { primaryButton, secondaryButton } from './styles';

type Props = {
  keys: KeyLabels;
  mobileLike: boolean;
  onFile: (file: File) => void;
};

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** 未読み込み時の案内（IN-6、docs/01 の 3.3・8章） */
export function EmptyState({ keys, mobileLike, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const choose = (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className={mobileLike ? `${primaryButton} min-h-12 px-6` : `${secondaryButton} px-3 py-1.5`}
    >
      {messages.empty.choose}
    </button>
  );

  return (
    <div className="flex h-full max-h-[380px] w-full max-w-[760px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 p-6 text-center">
      <ImageIcon className="text-zinc-500" />
      {mobileLike ? (
        choose
      ) : (
        <>
          <p className="text-xl font-semibold">
            <kbd className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[17px]">
              {messages.empty.pasteKey(keys)}
            </kbd>{' '}
            {messages.empty.pasteTitle}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-2 text-zinc-400">
            {messages.empty.dropOr}
            {choose}
          </p>
        </>
      )}
      <p className="mt-4 text-xs text-zinc-400">{messages.empty.privacy}</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // 同じファイルを続けて選べるように戻す（docs/02 の 3.3）
          event.currentTarget.value = '';
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
