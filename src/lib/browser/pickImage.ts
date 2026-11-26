// 貼り付け・ドロップのデータから画像を1件取り出す（F-01・F-02、docs/02 の 3.1・3.2）
import { isImageType } from '../core/imageType';

/**
 * 貼り付け（clipboardData）から image/* の最初の1件を取り出す。
 * text/html や text/plain が先にあっても飛ばす（IN-1）。getAsFile() が null の場合も null（仕様上ありうる）。
 */
export function pickImageFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items)) {
    if (item.kind === 'file' && isImageType(item.type)) {
      return item.getAsFile();
    }
  }
  return null;
}

/** ドロップ（dataTransfer.files）から image/* の最初の1件を取り出す。複数なら最初の画像だけ */
export function pickImageFromDrop(data: DataTransfer | null): File | null {
  if (!data) return null;
  return Array.from(data.files).find((file) => isImageType(file.type)) ?? null;
}
