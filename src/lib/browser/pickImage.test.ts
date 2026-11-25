// UT-BRW-01〜04（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { pickImageFromClipboard, pickImageFromDrop } from './pickImage';

const file = (name: string, type: string) => new File(['x'], name, { type });

/** 貼り付けの clipboardData もどき */
function clipboard(items: Array<{ kind: string; type: string; file: File | null }>): DataTransfer {
  return {
    items: items.map((i) => ({ kind: i.kind, type: i.type, getAsFile: () => i.file })),
  } as unknown as DataTransfer;
}

/** ドロップの dataTransfer もどき */
function drop(files: File[]): DataTransfer {
  return { files } as unknown as DataTransfer;
}

describe('pickImageFromClipboard', () => {
  it('UT-BRW-01：[text/html, image/png] から png を取り出す', () => {
    const png = file('a.png', 'image/png');
    const data = clipboard([
      { kind: 'string', type: 'text/html', file: null },
      { kind: 'file', type: 'image/png', file: png },
    ]);
    expect(pickImageFromClipboard(data)).toBe(png);
  });

  it('UT-BRW-02：[text/plain] だけなら null', () => {
    expect(
      pickImageFromClipboard(clipboard([{ kind: 'string', type: 'text/plain', file: null }])),
    ).toBe(null);
  });

  it('UT-BRW-03：画像の item の getAsFile() が null なら null', () => {
    expect(
      pickImageFromClipboard(clipboard([{ kind: 'file', type: 'image/png', file: null }])),
    ).toBe(null);
  });

  it('非対応の画像形式（image/bmp）も画像として取り出す（後で TS-02 にする）', () => {
    const bmp = file('a.bmp', 'image/bmp');
    expect(
      pickImageFromClipboard(clipboard([{ kind: 'file', type: 'image/bmp', file: bmp }])),
    ).toBe(bmp);
  });

  it('clipboardData がなければ null', () => {
    expect(pickImageFromClipboard(null)).toBe(null);
  });
});

describe('pickImageFromDrop', () => {
  it('UT-BRW-04：[text.txt, a.png, b.jpg] から a.png を取り出す', () => {
    const png = file('a.png', 'image/png');
    expect(
      pickImageFromDrop(drop([file('text.txt', 'text/plain'), png, file('b.jpg', 'image/jpeg')])),
    ).toBe(png);
  });

  it('画像がなければ null', () => {
    expect(pickImageFromDrop(drop([file('text.txt', 'text/plain')]))).toBe(null);
    expect(pickImageFromDrop(null)).toBe(null);
  });
});
