// 実際のブラウザでの、読み込み → 黒塗り・モザイク → 元に戻す の確認。
// 単体テスト（jsdom）では Canvas の画素を見られないため、ここで描画結果を確かめる（docs/06 の 4.2）。
import { expect, test, type Page } from '@playwright/test';

type Draw = 'text-on-white' | 'text-on-transparent';

/** ページの中で PNG を作り、ファイル選択（EmptyState の input）から読み込ませる */
async function loadImage(page: Page, width: number, height: number, draw: Draw) {
  const base64 = await page.evaluate(
    async ({ width, height, draw }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const g = c.getContext('2d')!;
      if (draw === 'text-on-white') {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, width, height);
        g.fillStyle = '#cc0000';
      } else {
        g.fillStyle = '#000000'; // 背景は透明のまま
      }
      g.font = 'bold 64px sans-serif';
      g.fillText('SECRET-TOKEN-1234', 100, 200);
      const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    { width, height, draw },
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64, 'base64'),
  });
  await expect(page.locator('main canvas')).toHaveJSProperty('width', width);
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * 原寸の座標で、キャンバスの上をドラッグする。
 * ブラウザが実際に受け取った座標（丸められることがある）から、アプリと同じ計算（docs/02 の 3.5）で
 * 確定した範囲を求めて返す。
 */
async function dragOnImage(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { beforeUp?: () => Promise<void> } = {},
): Promise<Rect> {
  const canvas = page.locator('main canvas');
  await canvas.evaluate((c: HTMLCanvasElement) => {
    const log: { x: number; y: number }[] = [];
    (c as HTMLCanvasElement & { pointerLog?: typeof log }).pointerLog = log;
    for (const type of ['pointerdown', 'pointerup'] as const) {
      c.addEventListener(type, (e) => log.push({ x: e.clientX, y: e.clientY }));
    }
  });
  const box = (await canvas.boundingBox())!;
  const width = await canvas.evaluate((c: HTMLCanvasElement) => c.width);
  const scale = box.width / width;
  await page.mouse.move(box.x + from.x * scale, box.y + from.y * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x * scale, box.y + to.y * scale, { steps: 5 });
  await options.beforeUp?.();
  await page.mouse.up();

  return canvas.evaluate((c: HTMLCanvasElement) => {
    const log = (c as HTMLCanvasElement & { pointerLog?: { x: number; y: number }[] }).pointerLog!;
    const r = c.getBoundingClientRect();
    const toImage = (p: { x: number; y: number }) => ({
      x: ((p.x - r.left) * c.width) / r.width,
      y: ((p.y - r.top) * c.height) / r.height,
    });
    const a = toImage(log[0]!);
    const b = toImage(log[log.length - 1]!);
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x)));
    const top = Math.max(0, Math.floor(Math.min(a.y, b.y)));
    const right = Math.min(c.width, Math.ceil(Math.max(a.x, b.x)));
    const bottom = Math.min(c.height, Math.ceil(Math.max(a.y, b.y)));
    return { x: left, y: top, w: right - left, h: bottom - top };
  });
}

/** 範囲の画素を [r, g, b, a] の配列で返す */
function readPixels(page: Page, x: number, y: number, w: number, h: number) {
  return page
    .locator('main canvas')
    .evaluate(
      (c: HTMLCanvasElement, r) =>
        Array.from(c.getContext('2d')!.getImageData(r.x, r.y, r.w, r.h).data),
      { x, y, w, h },
    );
}

/** Canvas 全体の画素のハッシュ（元に戻したかの比較用） */
function hashCanvas(page: Page) {
  return page.locator('main canvas').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (Math.imul(h, 31) + (d[i] ?? 0)) | 0;
    return h;
  });
}

const undoButton = (page: Page) => page.getByRole('button', { name: /元に戻す/ });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('黒塗り：範囲の画素はすべて不透明の黒、元に戻すと元の画像に戻る', async ({ page }) => {
  await loadImage(page, 900, 500, 'text-on-white');
  const original = await hashCanvas(page);

  // 文字（x 100〜約 750、y 約 150〜215）を覆う
  await dragOnImage(page, { x: 90, y: 130 }, { x: 850, y: 230 });
  await expect(undoButton(page)).toBeEnabled();

  const px = await readPixels(page, 0, 0, 900, 500);
  let black = 0;
  let red = 0;
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b, a] = [px[i]!, px[i + 1]!, px[i + 2]!, px[i + 3]!];
    if (r === 0 && g === 0 && b === 0 && a === 255) black++;
    else if (r > g + 30) red++; // 文字の色（縁の中間色を含む）
  }
  expect(black).toBeGreaterThan(0);
  expect(red).toBe(0); // 文字の画素が残っていない

  await undoButton(page).click();
  await expect(undoButton(page)).toBeDisabled();
  expect(await hashCanvas(page)).toBe(original);
});

test('モザイク（透過 PNG）：ブロックごとに単色になり、文字の形が残らない', async ({ page }) => {
  await loadImage(page, 900, 500, 'text-on-transparent');
  await page.keyboard.press('m');
  await expect(page.getByText('文字には黒塗りを推奨')).toBeVisible();

  const rect = await dragOnImage(page, { x: 90, y: 130 }, { x: 850, y: 230 });
  await expect(undoButton(page)).toBeEnabled();

  // 作業用 Canvas の1画素が、範囲の中の1ブロックになる（ブロックの大きさ 16 = max(16, round(500 × 0.02))）。
  // ブロックの境目は小数になりうるので、各ブロックの内側（境目から 1px 離した部分）が単色かを確かめる
  const block = 16;
  const cols = Math.ceil(rect.w / block);
  const rows = Math.ceil(rect.h / block);
  const px = await readPixels(page, rect.x, rect.y, rect.w, rect.h);
  let nonUniform = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.ceil((col * rect.w) / cols) + 1;
      const x1 = Math.floor(((col + 1) * rect.w) / cols) - 1;
      const y0 = Math.ceil((row * rect.h) / rows) + 1;
      const y1 = Math.floor(((row + 1) * rect.h) / rows) - 1;
      const first = (y0 * rect.w + x0) * 4;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * rect.w + x) * 4;
          if ([0, 1, 2, 3].some((k) => px[i + k] !== px[first + k])) nonUniform++;
        }
      }
    }
  }
  expect(nonUniform).toBe(0);

  // 範囲の外に文字の画素が残っていない（透明のまま）
  const all = await readPixels(page, 0, 0, 900, 500);
  let outside = 0;
  for (let i = 0; i < all.length; i += 4) {
    const p = i / 4;
    const x = p % 900;
    const y = Math.floor(p / 900);
    const inside = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    if (!inside && all[i + 3]! > 0) outside++;
  }
  expect(outside).toBe(0);
});

test('ドラッグ中の Esc で破棄すると、何も記録しない', async ({ page }) => {
  await loadImage(page, 900, 500, 'text-on-white');
  const original = await hashCanvas(page);
  await dragOnImage(
    page,
    { x: 90, y: 130 },
    { x: 850, y: 230 },
    {
      beforeUp: async () => {
        await expect(page.getByTestId('selection')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('selection')).toHaveCount(0);
      },
    },
  );
  await expect(undoButton(page)).toBeDisabled();
  expect(await hashCanvas(page)).toBe(original);
});

/** PNG のチャンクの種類を順に返す（メタデータが入っていないかの確認用） */
function pngChunkTypes(buf: Buffer): string[] {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  expect([...buf.subarray(0, 8)]).toEqual(signature);
  const types: string[] = [];
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    types.push(buf.toString('ascii', offset + 4, offset + 8));
    offset += 12 + length;
  }
  return types;
}

test('ダウンロード：redacted_image.png で、画面と同じ画素、メタデータなし', async ({ page }) => {
  await loadImage(page, 900, 500, 'text-on-white');
  await dragOnImage(page, { x: 90, y: 130 }, { x: 850, y: 230 });
  await expect(undoButton(page)).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /ダウンロード/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('redacted_image.png');
  await expect(
    page.getByRole('button', { name: 'redacted_image.png を保存しました' }),
  ).toBeVisible(); // トースト

  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const file = await readFile(path);

  // 撮影情報・位置・文字列などのメタデータを入れるチャンクがない。
  // 色や画素の形式を表すチャンク（sRGB・pHYs や、WebKit が付ける sBIT など）は個人の情報を含まないので許す
  const types = pngChunkTypes(file);
  expect(types[0]).toBe('IHDR');
  expect(types.at(-1)).toBe('IEND');
  expect(types.filter((t) => ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'].includes(t))).toEqual([]);

  // 保存したファイルをデコードし、画面の Canvas と画素が一致する
  const same = await page.locator('main canvas').evaluate(async (c: HTMLCanvasElement, b64) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const check = document.createElement('canvas');
    check.width = bitmap.width;
    check.height = bitmap.height;
    const g = check.getContext('2d')!;
    g.drawImage(bitmap, 0, 0);
    const a = g.getImageData(0, 0, check.width, check.height).data;
    const b = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    if (check.width !== c.width || check.height !== c.height) return 'size';
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return `diff at ${i}`;
    return 'same';
  }, file.toString('base64'));
  expect(same).toBe('same');
});
