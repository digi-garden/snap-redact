import { messages } from '../messages';
import { useCopyText } from '../hooks/useCopyText';
import { Dialog } from './Dialog';
import { ShieldIcon } from './icons';
import { focusRing, secondaryButton } from './styles';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** DL-02：通信をブロックしている仕組みと確かめ方（UI-2、柱A、docs/01 の 4.2） */
export function VerifyDialog({ open, onClose }: Props) {
  const { copied, copy } = useCopyText();
  const t = messages.verify;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <>
          <ShieldIcon size={20} className="text-emerald-400" />
          {t.title}
        </>
      }
    >
      {t.body.map((p) => (
        <p key={p} className="leading-relaxed text-zinc-300">
          {p}
        </p>
      ))}
      <h3 className="mt-1 font-semibold">{t.howTo}</h3>
      <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed text-zinc-300">
        {t.steps.map((step, i) => (
          <li key={step}>
            {step}
            {i === 3 && (
              <div className="my-1.5 flex flex-wrap items-center gap-2">
                <code className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-sm text-zinc-200">
                  {t.fetchCode}
                </code>
                <button
                  type="button"
                  onClick={() => void copy(t.fetchCode)}
                  className={`rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 ${focusRing}`}
                >
                  {copied ? t.copiedCode : t.copyCode}
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm leading-relaxed text-zinc-400">{t.extensionNote}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-zinc-400">
          {t.source}
          <a
            href="https://github.com/digi-garden/snap-redact"
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded text-emerald-400 hover:underline ${focusRing}`}
          >
            {t.sourceLabel}
          </a>
        </span>
        <button type="button" data-autofocus onClick={onClose} className={secondaryButton}>
          {t.close}
        </button>
      </div>
    </Dialog>
  );
}
