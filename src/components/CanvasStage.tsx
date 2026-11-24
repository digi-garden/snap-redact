import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/**
 * キャンバス領域（docs/01 の 3.3、docs/03 の 5.2）。
 * S4 では未読み込み時の案内だけを置く。Canvas の差し込み・選択枠・ドロップの強調は S6〜S8 で加える。
 */
export function CanvasStage({ children }: Props) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">{children}</main>
  );
}
