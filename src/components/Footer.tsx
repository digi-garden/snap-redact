import { messages } from '../messages';
import { container, textLink } from './styles';

/** 別タブで開く。同じタブで移動すると、編集中の画像（メモリ上だけにある）が消えるため */
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

type Props = {
  /** 「安全性とプライバシー」：外部通信をブロックしている仕組みと確かめ方（DL-02）を開く */
  onOpenSafety: () => void;
};

/**
 * フッター（UI-5、docs/01 の 3.5）。既存2作（Mask & Unmask・Context-Packer）と同じ3行・同じ大きさにそろえる：
 * 1行目 他のツール、2行目 安全性とプライバシー → OSSライセンス → 利用規約 → プライバシーポリシー、3行目 提供元と著作権。
 * リンク先は固定の文字列だけ（docs/04 の 3.3）
 */
export function Footer({ onOpenSafety }: Props) {
  const t = messages.footer;
  return (
    <footer className="border-t border-cn-border bg-cn-bg py-6 text-center text-sm text-cn-text-muted">
      <div className={`${container} flex flex-col items-center gap-3`}>
        <nav aria-label={t.toolsLabel} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a href="https://circle-note.com/mask-unmask/" {...external} className={textLink}>
            {t.maskUnmask}
          </a>
          <a href="https://circle-note.com/context-packer/" {...external} className={textLink}>
            {t.contextPacker}
          </a>
          <a href="https://circle-note.com/vram-calculator/" {...external} className={textLink}>
            {t.vramCalculator}
          </a>
        </nav>
        <nav aria-label={t.policyLabel} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <button type="button" onClick={onOpenSafety} aria-haspopup="dialog" className={textLink}>
            {t.safety}
          </button>
          <a href="/snap-redact/third-party-licenses/" {...external} className={textLink}>
            {t.licenses}
          </a>
          <a href="https://digi-garden.com/terms/" {...external} className={textLink}>
            {t.terms}
          </a>
          <a href="https://digi-garden.com/privacy/" {...external} className={textLink}>
            {t.privacy}
          </a>
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
