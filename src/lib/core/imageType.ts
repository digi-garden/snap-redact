// 対応する画像形式（IN-3、docs/02 の 3.4 手順1）

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export function isSupportedImageType(type: string): type is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/** image/* かどうか（貼り付け・ドロップで「画像らしいもの」を探すときに使う。対応外の形式は後で TS-02 にする） */
export function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

/** GIF は最初のコマだけになるので通知する（TS-09） */
export function isGif(type: string): boolean {
  return type === 'image/gif';
}
