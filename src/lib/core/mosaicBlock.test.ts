// UT-MOS-01（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { mosaicBlockSize } from './mosaicBlock';

describe('mosaicBlockSize', () => {
  it.each([
    [800, 600, 16],
    [1920, 1080, 22],
    [3840, 2160, 43],
    [10, 10, 16],
  ])('%i × %i → %i px', (w, h, expected) => {
    expect(mosaicBlockSize(w, h)).toBe(expected);
  });

  it('縦長でも短辺で決まる', () => {
    expect(mosaicBlockSize(1080, 1920)).toBe(mosaicBlockSize(1920, 1080));
  });
});
