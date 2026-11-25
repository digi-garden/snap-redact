// 新しい画像を描いた Canvas を用意する（IN-7、docs/02 の 3.4 手順4・3.8）
// 既存の状態には触れずに「描けるか」を確かめ、描けた Canvas をそのまま表示に使う。
// 大きすぎる画像では getContext が null を返したり、例外が出たりする。

/** テストで偽物の Canvas を渡せるようにする */
export type CanvasFactory = () => HTMLCanvasElement;

const defaultFactory: CanvasFactory = () => document.createElement('canvas');

export function prepareCanvas(
  base: CanvasImageSource,
  width: number,
  height: number,
  createCanvas: CanvasFactory = defaultFactory,
): HTMLCanvasElement | null {
  const canvas = createCanvas();
  try {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      releaseCanvas(canvas);
      return null;
    }
    ctx.drawImage(base, 0, 0);
    return canvas;
  } catch {
    releaseCanvas(canvas);
    return null;
  }
}

/** 使わなくなった Canvas のメモリを手放す（大きさを 0 にする） */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}
