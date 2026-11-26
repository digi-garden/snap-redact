import { useEffect, useId, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 開いたときは data-autofocus を付けた要素にフォーカスする（なければブラウザの既定） */
  children: ReactNode;
  /** 幅のクラス（既定は最大 640px） */
  widthClass?: string;
};

/**
 * ダイアログの共通部品（F-13、docs/01 の 4章・9章）。
 * ブラウザ標準の <dialog> の showModal を使う。背後の操作の無効化、フォーカスの閉じ込め、
 * Esc での取り消し、閉じた後に元の要素へフォーカスを戻す動きは、ブラウザに任せる。
 * 背景（ダイアログの外側）をクリックしたときも閉じる。
 * onClose を呼ぶのは Esc（cancel）と背景クリックと、子の「閉じる」ボタンだけ。ネイティブの close イベントは
 * 親が open=false にしたとき（dialog.close()）にも発火するため拾わない（拾うと onClose が2回呼ばれる。P2 レビュー #2）。
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  widthClass = 'w-[min(640px,calc(100vw-32px))]',
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom など showModal / close がない環境では、open 属性だけで開閉する
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc：ブラウザに閉じさせず、親の状態（open）で閉じる
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // ダイアログ本体の外側（::backdrop）のクリックは、<dialog> 要素自体へのクリックとして届く
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[90dvh] ${widthClass} overflow-auto rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70`}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="flex items-center gap-2 text-[17px] font-bold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
