// UT-KEY-01〜07（docs/06-test-design.md 2.1）
import { describe, expect, it } from 'vitest';
import { decideShortcut, type KeyContext, type KeyInput } from './shortcuts';

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  ...mods,
});
const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({
  isModalOpen: false,
  isDragging: false,
  canUndo: true,
  canExport: true,
  hasTextSelection: false,
  ...over,
});

describe('decideShortcut', () => {
  it('UT-KEY-01：日本語入力の変換中は、どのキーでも何もしない', () => {
    for (const k of [key('b'), key('m'), key('Escape'), key('z', { ctrlKey: true })]) {
      expect(decideShortcut({ ...k, isComposing: true }, ctx({ isDragging: true }))).toBeNull();
    }
    expect(decideShortcut(key('b', { keyCode: 229 }), ctx())).toBeNull();
  });

  it('UT-KEY-02：ダイアログ表示中は Esc も Ctrl+Z も扱わない（Esc はダイアログ自身が閉じる）', () => {
    const modal = ctx({ isModalOpen: true });
    expect(decideShortcut(key('Escape'), modal)).toBeNull();
    expect(decideShortcut(key('z', { ctrlKey: true }), modal)).toBeNull();
    expect(decideShortcut(key('b'), modal)).toBeNull();
  });

  it('UT-KEY-03：Ctrl+Z と ⌘Z は Undo、Shift 付きは何もしない', () => {
    expect(decideShortcut(key('z', { ctrlKey: true }), ctx())).toBe('undo');
    expect(decideShortcut(key('z', { metaKey: true }), ctx())).toBe('undo');
    expect(decideShortcut(key('Z', { ctrlKey: true, shiftKey: true }), ctx())).toBeNull();
    expect(decideShortcut(key('z', { ctrlKey: true }), ctx({ canUndo: false }))).toBeNull();
  });

  it('UT-KEY-04：Ctrl+C（画像あり・選択なし・ドラッグなし） → コピー', () => {
    expect(decideShortcut(key('c', { ctrlKey: true }), ctx())).toBe('copy');
    expect(decideShortcut(key('c', { metaKey: true }), ctx())).toBe('copy');
  });

  it('UT-KEY-05：Ctrl+C（文字の選択あり／画像なし／ドラッグ中） → 何もしない', () => {
    const c = key('c', { ctrlKey: true });
    expect(decideShortcut(c, ctx({ hasTextSelection: true }))).toBeNull();
    expect(decideShortcut(c, ctx({ canExport: false }))).toBeNull();
    expect(decideShortcut(c, ctx({ isDragging: true }))).toBeNull();
  });

  it('UT-KEY-06：B / M は切り替え、修飾キー付きとドラッグ中は何もしない', () => {
    expect(decideShortcut(key('b'), ctx())).toBe('modeFill');
    expect(decideShortcut(key('m'), ctx())).toBe('modeMosaic');
    expect(decideShortcut(key('b', { ctrlKey: true }), ctx())).toBeNull();
    expect(decideShortcut(key('b', { metaKey: true }), ctx())).toBeNull();
    expect(decideShortcut(key('b', { altKey: true }), ctx())).toBeNull();
    expect(decideShortcut(key('B', { shiftKey: true }), ctx())).toBeNull();
    expect(decideShortcut(key('b'), ctx({ isDragging: true }))).toBeNull();
  });

  it('UT-KEY-07：Caps Lock 中の B（e.key = "B"、Shift なし） → 切り替え', () => {
    expect(decideShortcut(key('B'), ctx())).toBe('modeFill');
    expect(decideShortcut(key('M'), ctx())).toBe('modeMosaic');
  });

  it('ドラッグ中の Esc → ドラッグを破棄。ドラッグしていなければ何もしない', () => {
    expect(decideShortcut(key('Escape'), ctx({ isDragging: true }))).toBe('cancelDrag');
    expect(decideShortcut(key('Escape'), ctx())).toBeNull();
  });

  it('画像がなくても B / M で切り替えられる', () => {
    expect(decideShortcut(key('m'), ctx({ canUndo: false, canExport: false }))).toBe('modeMosaic');
  });
});
