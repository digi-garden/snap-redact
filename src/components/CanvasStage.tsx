import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { messages } from '../messages';
import { container as pageContainer } from './styles';

type Props = {
  /** 表示用 Canvas（useImageLoader が用意したもの）。未読み込みなら null */
  canvas: HTMLCanvasElement | null;
  /** 未読み込み時の案内 */
  empty: ReactNode;
  /** ファイルを重ねているか（強調表示） */
  dropping: boolean;
  /** ドラッグ中の選択枠（SelectionOverlay）。Canvas の上に重ねる */
  selection?: ReactNode;
};

/**
 * 表示用 Canvas の見た目（docs/01 の 3.3、docs/03 の 5.2）。
 * 受け取った Canvas 要素は書き換えず、差し込む先の要素から子の canvas にクラスを当てる。
 * - 縦横比を保って領域に収まるよう縮小する。原寸より大きくはしない
 * - 透過部分がわかるよう、背景に市松模様を敷く（CSS のグラデーション。data: URI は CSP で使えない）。出力には含まれない
 * - border と padding は付けない（座標の変換がずれるため。docs/02 の 3.5.1）
 * - タッチでもドラッグで矩形を指定できるよう、スクロールなどの既定の操作を止める（docs/01 の 6章）
 */
const HOST_CLASS =
  'flex h-full w-full items-center justify-center [&>canvas]:block [&>canvas]:max-h-full [&>canvas]:max-w-full [&>canvas]:cursor-crosshair [&>canvas]:touch-none [&>canvas]:select-none [&>canvas]:bg-[repeating-conic-gradient(var(--color-cn-surface)_0_25%,var(--color-cn-bg)_0_50%)] [&>canvas]:bg-size-[16px_16px] [&>canvas]:shadow-lg [&>canvas]:shadow-black/40';

/**
 * キャンバス領域（docs/01 の 3.3、docs/03 の 5.2）。
 * 表示用 Canvas は React に描画させず、用意された要素をそのまま差し込む（docs/02 の 3.4 手順6）。
 * 選択枠は Canvas の外側の要素に重ねる（Canvas を差し込む要素の子にすると、差し込むときに消えるため）。
 */
export function CanvasStage({ canvas, empty, dropping, selection }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = container.current;
    if (!host || !canvas) return;
    host.replaceChildren(canvas);
    return () => {
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, [canvas]);

  return (
    // 高さが足りないときは中でスクロールする。中央寄せは子の m-auto で行う（items-center だと上側が切れてスクロールできないため）
    <main className="relative flex min-h-0 flex-1 overflow-auto py-4 sm:py-6">
      {/* 横幅はヘッダー・フッターとそろえる（CircleNote ガイドライン 4章） */}
      <div className={`${pageContainer} flex h-full`}>
        {canvas ? (
          <div role="img" aria-label={messages.canvasLabel} className="relative h-full w-full">
            <div ref={container} className={HOST_CLASS} />
            {selection}
          </div>
        ) : (
          empty
        )}
      </div>
      {dropping && (
        // ファイルを重ねているとき（キャンバスの外に重ねても同じ。docs/01 の 3.3）
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl border-2 border-dashed border-cn-accent bg-cn-accent/10 text-lg font-semibold text-cn-link"
        >
          {messages.dropHere}
        </div>
      )}
    </main>
  );
}
