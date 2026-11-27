import { messages } from '../messages';
import { container, textLink } from './styles';

/** 別タブで開く。同じタブで移動すると、編集中の画像（メモリ上だけにある）が消えるため */
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * フッター（UI-5、docs/01 の 3.5）。CircleNote の共通シェル（brand-assets の CircleNoteFooter）の3行に合わせる：
 * 1行目 他のツール、2行目 規約などのリンク、3行目 提供元と著作権。
 * リンク先は固定の文字列だけ（docs/04 の 3.3）。編集の画面を広く取るため、余白は見本より小さくする
 */
export function Footer() {
  const t = messages.footer;
  return (
    <footer className="shrink-0 border-t border-cn-border py-2.5 text-center text-xs text-cn-text-muted">
      <div className={`${container} flex flex-col items-center gap-1.5`}>
        <nav aria-label={t.toolsLabel} className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>
            {t.maskUnmaskLead}{' '}
            <a href="https://circle-note.com/mask-unmask/" {...external} className={textLink}>
              {t.maskUnmask}
            </a>
          </span>
          <a href="https://circle-note.com/context-packer/" {...external} className={textLink}>
            {t.contextPacker}
          </a>
          <a href="https://circle-note.com/vram-calculator/" {...external} className={textLink}>
            {t.vramCalculator}
          </a>
        </nav>
        <nav aria-label={t.policyLabel} className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a href="/snap-redact/third-party-licenses/" {...external} className={textLink}>
            {t.licenses}
          </a>
          <a href="https://digi-garden.com/terms/" {...external} className={textLink}>
            {t.terms}
          </a>
          <a href="https://digi-garden.com/privacy/" {...external} className={textLink}>
            {t.privacy}
          </a>
          <a href="https://github.com/digi-garden/snap-redact" {...external} className={textLink}>
            {t.github}
          </a>
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>{t.disclaimer}</span>
          <span>
            {t.by}{' '}
            <a href="https://digi-garden.com/" {...external} className={textLink}>
              {t.provider}
            </a>
          </span>
          <span>{t.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
