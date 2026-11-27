// 画像をクリップボードに書き込む（F-10、docs/02 の 3.11）

export type CopyResult = 'ok' | 'unsupported' | 'failed';

/**
 * Canvas の内容を PNG でクリップボードにコピーする。
 * - ボタンのクリックや Ctrl+C の keydown の中で、await を挟まずに呼ぶこと（ユーザー操作の判定を切らさない）
 * - ClipboardItem には Blob ではなく Promise を渡す。Safari は、ユーザー操作の中で同期的に write を呼ぶ必要があり、
 *   toBlob の完了を待ってから write すると拒否されるため
 */
export async function copyImage(canvas: HTMLCanvasElement): Promise<CopyResult> {
  if (typeof ClipboardItem === 'undefined' || typeof navigator.clipboard?.write !== 'function') {
    return 'unsupported';
  }
  const blob = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('toBlob returned null')); // 大きすぎる画像など
    }, 'image/png');
  });
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'ok';
  } catch {
    return 'failed';
  }
}
