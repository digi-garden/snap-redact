import { messages } from '../messages';
import { focusRing } from './styles';

const link = `rounded text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline ${focusRing}`;

/** フッター（UI-5、docs/01 の 3.5）。リンク先は固定の文字列だけ（docs/04 の 3.3） */
export function Footer() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-zinc-800 px-4 py-2.5 text-xs text-zinc-400 sm:px-6">
      <span>
        {messages.footer.maskUnmaskLead}{' '}
        <a
          href="https://circle-note.com/mask-unmask/"
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {messages.footer.maskUnmask}
        </a>
      </span>
      <a
        href="https://github.com/digi-garden/snap-redact"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        {messages.footer.github}
      </a>
      <span>{messages.footer.disclaimer}</span>
      <span>{messages.footer.copyright}</span>
    </footer>
  );
}
