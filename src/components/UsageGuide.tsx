import { messages, type KeyLabels } from '../messages';
import { container, textLink } from './styles';

/** 別タブで開く（同じタブで移動すると、編集中の画像が消えるため） */
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

type Props = { keys: KeyLabels };

const card = 'space-y-2 rounded-xl border border-cn-border bg-cn-bg/40 p-4';
const cardTitle = 'text-base font-semibold text-cn-accent';

/**
 * ページ下部の用途・使い方・よくある質問（docs/01 の 3.6）。
 * 既存2作（Mask & Unmask など）の下部の説明と同じ構成・大きさにそろえる（CircleNote ガイドライン 4章の4）。
 * 要件 UI-5 の Mask & Unmask への導線・免責文・GitHub はここに置く（フッターは既存2作と同じ項目にそろえるため）。
 * 編集の画面（ヘッダーからアクションバーまで）は画面の高さいっぱいのまま、この説明はスクロールした先に置く
 */
export function UsageGuide({ keys }: Props) {
  const t = messages.guide;
  return (
    <div className={`${container} py-6`}>
      <section
        aria-labelledby="usage-guide-heading"
        className="space-y-5 rounded-2xl border border-cn-border bg-cn-surface p-5 text-sm leading-relaxed text-cn-text-muted md:p-6"
      >
        <h2 id="usage-guide-heading" className="text-lg font-semibold text-cn-text">
          {t.title}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={card}>
            <h3 className={cardTitle}>{t.useCaseTitle}</h3>
            <p>{t.useCase}</p>
            <p>
              {t.maskUnmaskLead}{' '}
              <a href="https://circle-note.com/mask-unmask/" {...external} className={textLink}>
                {t.maskUnmask}
              </a>
            </p>
          </div>
          <div className={card}>
            <h3 className={cardTitle}>{t.stepsTitle}</h3>
            <ol className="list-inside list-decimal space-y-1">
              {t.steps(keys).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className={card}>
            <h3 className={cardTitle}>{t.notesTitle}</h3>
            <ul className="list-inside list-disc space-y-1">
              {t.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-3 border-t border-cn-border pt-4">
          <h3 className="text-base font-semibold text-cn-text">{t.faqTitle}</h3>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {t.faq.map((item) => (
              <div key={item.q} className="space-y-1">
                <dt className="font-semibold text-cn-text">{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <p>
            {t.sourceLead}
            <a href="https://github.com/digi-garden/snap-redact" {...external} className={textLink}>
              {t.source}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
