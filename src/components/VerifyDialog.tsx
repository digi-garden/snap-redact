import { messages } from '../messages';
import { useCopyText } from '../hooks/useCopyText';
import { Dialog } from './Dialog';
import { ShieldIcon } from './icons';
import { focusRing, secondaryButton, textLink, touchTarget } from './styles';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** DL-02：通信をブロックしている仕組みと確かめ方（UI-2、柱A、docs/01 の 4.2） */
export function VerifyDialog({ open, onClose }: Props) {
  const { copied, copy, reset } = useCopyText();
  const t = messages.verify;
  // 閉じたら「コピーしました」の表示を戻す（P2 レビュー #3）
  const close = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={
        <>
          <ShieldIcon size={20} className="text-cn-accent" />
          {t.title}
        </>
      }
    >
      {t.body.map((p) => (
        <p key={p} className="leading-relaxed text-cn-text-muted">
          {p}
        </p>
      ))}
      <h3 className="mt-1 font-semibold">{t.howTo}</h3>
      <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed text-cn-text-muted">
        {t.steps.map((step, i) => (
          <li key={step}>
            {step}
            {i === 3 && (
              <div className="my-1.5 flex flex-wrap items-center gap-2">
                <code className="rounded-md border border-cn-border bg-cn-bg px-2.5 py-1.5 font-mono text-sm text-cn-text">
                  {t.fetchCode}
                </code>
                <button
                  type="button"
                  onClick={() => void copy(t.fetchCode)}
                  className={`rounded-md border border-cn-border-strong px-2.5 py-1.5 text-xs text-cn-text hover:bg-cn-border ${touchTarget} ${focusRing}`}
                >
                  {copied ? t.copiedCode : t.copyCode}
                </button>
                {/* コピーの完了をスクリーンリーダーに伝える（P2 レビュー #3） */}
                <span role="status" className="sr-only">
                  {copied ? t.copiedCode : ''}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm leading-relaxed text-cn-text-muted">{t.extensionNote}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-cn-text-muted">
          {t.source}
          <a
            href="https://github.com/digi-garden/snap-redact"
            target="_blank"
            rel="noopener noreferrer"
            className={textLink}
          >
            {t.sourceLabel}
          </a>
        </span>
        <button type="button" data-autofocus onClick={close} className={secondaryButton}>
          {t.close}
        </button>
      </div>
    </Dialog>
  );
}
