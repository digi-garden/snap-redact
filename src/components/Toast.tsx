import type { ToastState } from '../hooks/useToast';
import { messages } from '../messages';
import { focusRing } from './styles';

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
};

const iconColor = { success: 'text-emerald-400', info: 'text-zinc-300', error: 'text-red-400' };
const borderColor = {
  success: 'border-emerald-500',
  info: 'border-zinc-600',
  error: 'border-red-400',
};

/**
 * トースト（F-12、docs/01 の 5.1）。画面下部の中央（アクションバーの上）に1件だけ出す。
 * 読み上げ：成功・情報は role=status、エラーは role=alert。クリックで閉じる。
 * 読み上げの領域は常に置いておき、中身だけを入れ替える（領域ごと出し入れすると読まれないことがあるため）。
 */
export function Toast({ toast, onDismiss }: Props) {
  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {toast && toast.kind !== 'error' ? toast.text : ''}
      </div>
      <div role="alert" aria-live="assertive" className="sr-only">
        {toast?.kind === 'error' ? toast.text : ''}
      </div>
      {toast && (
        <button
          key={toast.id}
          type="button"
          onClick={onDismiss}
          aria-label={`${toast.text}（${messages.toast.close}）`}
          className={`pointer-events-auto fixed bottom-24 left-1/2 z-10 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-zinc-900 px-4 py-2.5 text-left text-sm text-zinc-100 shadow-xl shadow-black/50 ${borderColor[toast.kind]} ${focusRing}`}
        >
          <span aria-hidden="true" className={iconColor[toast.kind]}>
            {toast.kind === 'error' ? '!' : toast.kind === 'success' ? '✓' : 'i'}
          </span>
          <span aria-hidden="true">{toast.text}</span>
        </button>
      )}
    </>
  );
}
