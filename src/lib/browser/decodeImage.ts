// 画像のデコード（docs/02 の 3.4 手順2）
// fetch(URL.createObjectURL(file)) は CSP の connect-src 'none' で止められるため使わない。
// createImageBitmap に File を直接渡す。EXIF の向きはブラウザの既定（from-image）に任せる。

export async function decodeImage(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}
