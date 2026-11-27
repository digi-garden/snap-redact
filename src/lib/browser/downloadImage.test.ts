// UT-BRW-08 ほか（docs/06-test-design.md 2.2）
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOWNLOAD_FILE_NAME, downloadImage, REVOKE_DELAY_MS } from './downloadImage';

function fakeCanvas(blob: Blob | null) {
  return {
    toBlob: vi.fn((cb: (b: Blob | null) => void) => queueMicrotask(() => cb(blob))),
  } as unknown as HTMLCanvasElement;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('downloadImage', () => {
  it("UT-BRW-08：toBlob が null → 'failed'、リンクは作らない", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    expect(await downloadImage(fakeCanvas(null))).toBe('failed');
    expect(click).not.toHaveBeenCalled();
  });

  it("toBlob が例外 → 'failed'", async () => {
    const canvas = {
      toBlob: () => {
        throw new Error('SecurityError');
      },
    } as unknown as HTMLCanvasElement;
    expect(await downloadImage(canvas)).toBe('failed');
  });

  it('redacted_image.png の名前でリンクをクリックし、後で Blob URL を解放する', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    let clicked: { href: string; download: string; connected: boolean } | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = { href: this.href, download: this.download, connected: this.isConnected };
    });

    expect(await downloadImage(fakeCanvas(new Blob(['x'])))).toBe('ok');
    expect(clicked).toEqual({ href: 'blob:test', download: DOWNLOAD_FILE_NAME, connected: true });
    expect(document.querySelector('a[download]')).toBeNull(); // クリック後に取り除く
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS);
    expect(revoke).toHaveBeenCalledWith('blob:test');
    vi.unstubAllGlobals();
  });
});
