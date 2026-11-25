// テキストをクリップボードに書き込む（DL-02 のコード例のコピー用）。
// 画像のコピー（OUT-1）は S11 の copyImage.ts で扱う。

export async function copyText(text: string): Promise<'ok' | 'failed'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'ok';
  } catch {
    return 'failed';
  }
}
