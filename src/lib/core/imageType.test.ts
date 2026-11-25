// UT-TYP-01〜02（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { isGif, isImageType, isSupportedImageType } from './imageType';

describe('imageType', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])('UT-TYP-01：%s は対応', (t) => {
    expect(isSupportedImageType(t)).toBe(true);
  });

  it.each(['image/bmp', 'image/svg+xml', 'text/plain', '', 'IMAGE/PNG'])(
    'UT-TYP-02：%s は非対応',
    (t) => {
      expect(isSupportedImageType(t)).toBe(false);
    },
  );

  it('image/* の判定（非対応形式も画像として拾い、後で TS-02 にする）', () => {
    expect(isImageType('image/bmp')).toBe(true);
    expect(isImageType('text/html')).toBe(false);
  });

  it('GIF の判定', () => {
    expect(isGif('image/gif')).toBe(true);
    expect(isGif('image/png')).toBe(false);
  });
});
