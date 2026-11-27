// 画像を PNG ファイルとして保存する（F-11、docs/02 の 3.12）

/** 保存するファイル名（OUT-3） */
export const DOWNLOAD_FILE_NAME = 'redacted_image.png';

/**
 * Blob URL を解放するまでの時間。保存の開始より先に解放すると、ブラウザによっては保存に失敗するため、
 * 少し待ってから解放する（Blob は画像1枚分なので、数秒残っても問題ない）
 */
export const REVOKE_DELAY_MS = 1000;

/**
 * Canvas の内容を PNG で保存する。Canvas から書き出すので、元画像の EXIF などは含まれない（OUT-4）。
 * <a download> を作ってクリックする。ページの移動ではないので、CSP や遷移の禁止（04 の 3章）には当たらない。
 */
export function downloadImage(
  canvas: HTMLCanvasElement,
  fileName: string = DOWNLOAD_FILE_NAME,
): Promise<'ok' | 'failed'> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve('failed'); // 大きすぎる画像など
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.rel = 'noopener';
        document.body.append(link); // 一部のブラウザは、文書に入っていないリンクのクリックを無視する
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
        resolve('ok');
      }, 'image/png');
    } catch {
      resolve('failed');
    }
  });
}
