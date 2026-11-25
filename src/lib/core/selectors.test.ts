// UT-SEL-01〜03（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { acceptsInput, canExport, canUndo, needsReplaceConfirm } from './selectors';
import type { EditorState, Op } from './types';

const op: Op = { kind: 'fill', rect: { x: 0, y: 0, w: 5, h: 5 } };
const empty: EditorState<null> = { status: 'empty', mode: 'fill' };
const loaded = (n: number, unsaved: boolean): EditorState<null> => ({
  status: 'loaded',
  mode: 'fill',
  base: null,
  width: 10,
  height: 10,
  ops: Array.from({ length: n }, () => op),
  unsaved,
});

describe('selectors', () => {
  it('UT-SEL-01：canUndo は loaded かつ ops 1件以上のときだけ true', () => {
    expect(canUndo(empty)).toBe(false);
    expect(canUndo(loaded(0, false))).toBe(false);
    expect(canUndo(loaded(1, true))).toBe(true);
  });

  it('canExport は loaded のときだけ true', () => {
    expect(canExport(empty)).toBe(false);
    expect(canExport(loaded(0, false))).toBe(true);
  });

  it.each([
    [false, 0, false],
    [false, 2, false],
    [true, 0, false],
    [true, 2, true],
  ])('UT-SEL-02：unsaved=%s・ops %i 件 → needsReplaceConfirm=%s', (unsaved, n, expected) => {
    expect(needsReplaceConfirm(loaded(n, unsaved))).toBe(expected);
  });

  it('UT-SEL-02：empty では確認しない', () => {
    expect(needsReplaceConfirm(empty)).toBe(false);
  });

  it.each([
    [false, false, true],
    [true, false, false],
    [false, true, false],
    [true, true, false],
  ])(
    'UT-SEL-03：ダイアログ=%s・ドラッグ=%s → acceptsInput=%s',
    (isModalOpen, isDragging, expected) => {
      expect(acceptsInput({ isModalOpen, isDragging })).toBe(expected);
    },
  );
});
