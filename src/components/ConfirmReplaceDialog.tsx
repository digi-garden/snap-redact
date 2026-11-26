import { messages } from '../messages';
import { Dialog } from './Dialog';
import { secondaryButton, touchTarget, focusRing } from './styles';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * DL-01：差し替えの確認（IN-5、docs/01 の 4.1）。
 * 初期フォーカスは「キャンセル」（誤操作で編集を失わないため）。Esc・背景クリックはキャンセルと同じ。
 */
export function ConfirmReplaceDialog({ open, onCancel, onConfirm }: Props) {
  const t = messages.replace;
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={t.title}
      widthClass="w-[min(440px,calc(100vw-32px))]"
    >
      <p className="leading-relaxed text-zinc-300">{t.body}</p>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button type="button" data-autofocus onClick={onCancel} className={secondaryButton}>
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`inline-flex items-center gap-2 rounded-md bg-red-400 px-[18px] py-2.5 text-sm font-semibold text-zinc-950 hover:bg-red-300 ${touchTarget} ${focusRing}`}
        >
          {t.confirm}
        </button>
      </div>
    </Dialog>
  );
}
