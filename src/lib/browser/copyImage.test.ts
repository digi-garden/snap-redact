// UT-BRW-05〜07（docs/06-test-design.md 2.2）
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyImage } from './copyImage';

/** toBlob が指定の Blob（または null）を返す偽物の Canvas */
function fakeCanvas(blob: Blob | null) {
  return {
    toBlob: vi.fn((cb: (b: Blob | null) => void, type?: string) => {
      expect(type).toBe('image/png');
      queueMicrotask(() => cb(blob));
    }),
  } as unknown as HTMLCanvasElement;
}

/** ClipboardItem の偽物：渡された値をそのまま持つ */
class FakeClipboardItem {
  constructor(public readonly items: Record<string, unknown>) {}
}

function stubClipboard(write: (items: unknown[]) => Promise<void>) {
  vi.stubGlobal('ClipboardItem', FakeClipboardItem);
  const clipboard = { write: vi.fn(write) };
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  return clipboard;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('copyImage', () => {
  it("UT-BRW-05：ClipboardItem がない → 'unsupported'", async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn() },
      configurable: true,
    });
    expect(await copyImage(fakeCanvas(new Blob()))).toBe('unsupported');
  });

  it("navigator.clipboard.write がない → 'unsupported'", async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    expect(await copyImage(fakeCanvas(new Blob()))).toBe('unsupported');
  });

  it("UT-BRW-06：write が reject → 'failed'", async () => {
    stubClipboard(() => Promise.reject(new Error('NotAllowedError')));
    expect(await copyImage(fakeCanvas(new Blob()))).toBe('failed');
  });

  it('UT-BRW-07：write には Blob ではなく Promise を渡し、write は同期的に呼ばれる（Safari 対策）', async () => {
    const png = new Blob(['x'], { type: 'image/png' });
    const clipboard = stubClipboard(() => Promise.resolve());
    const pending = copyImage(fakeCanvas(png));
    // toBlob の完了を待たずに write が呼ばれている
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    const [items] = clipboard.write.mock.calls[0] as [FakeClipboardItem[]];
    const value = items[0]!.items['image/png'];
    expect(value).toBeInstanceOf(Promise);
    expect(await value).toBe(png);
    expect(await pending).toBe('ok');
  });

  it("toBlob が null（大きすぎる画像） → 'failed'", async () => {
    // 実際のブラウザでは、渡した Promise が reject されると write も reject される
    stubClipboard(async (items) => {
      await (items[0] as FakeClipboardItem).items['image/png'];
    });
    expect(await copyImage(fakeCanvas(null))).toBe('failed');
  });
});
