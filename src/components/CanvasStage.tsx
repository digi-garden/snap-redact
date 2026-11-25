import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { messages } from '../messages';

type Props = {
  /** 表示用 Canvas（useImageLoader が用意したもの）。未読み込みなら null */
  canvas: HTMLCanvasElement | null;
  /** 未読み込み時の案内 */
  empty: ReactNode;
};

/**
 * 表示用 Canvas の見た目（docs/01 の 3.3、docs/03 の 5.2）。
 * 受け取った Canvas 要素は書き換えず、差し込む先の要素から子の canvas にクラスを当てる。
 * - 縦横比を保って領域に収まるよう縮小する。原寸より大きくはしない
 * - 透過部分がわかるよう、背景に市松模様を敷く（CSS のグラデーション。data: URI は CSP で使えない）。出力には含まれない
 * - border と padding は付けない（座標の変換がずれるため。docs/02 の 3.5.1）
 */
const HOST_CLASS =
  'flex h-full w-full items-center justify-center [&>canvas]:block [&>canvas]:max-h-full [&>canvas]:max-w-full [&>canvas]:cursor-crosshair [&>canvas]:bg-[repeating-conic-gradient(var(--color-zinc-800)_0_25%,var(--color-zinc-900)_0_50%)] [&>canvas]:bg-size-[16px_16px] [&>canvas]:shadow-lg [&>canvas]:shadow-black/40';

/**
 * キャンバス領域（docs/01 の 3.3、docs/03 の 5.2）。
 * 表示用 Canvas は React に描画させず、用意された要素をそのまま差し込む（docs/02 の 3.4 手順6）。
 * 選択枠・ドロップの強調は S7・S8 で加える。
 */
export function CanvasStage({ canvas, empty }: Props) {
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
    <main className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
      {canvas ? (
        <div ref={container} role="img" aria-label={messages.canvasLabel} className={HOST_CLASS} />
      ) : (
        empty
      )}
    </main>
  );
}
