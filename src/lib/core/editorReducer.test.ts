// UT-RED-01〜10（docs/06-test-design.md 2.2）
import { describe, expect, it } from 'vitest';
import { editorReducer, initialEditorState } from './editorReducer';
import type { EditorState, Op } from './types';

type Img = { id: string };
const imgA: Img = { id: 'A' };
const imgB: Img = { id: 'B' };
const fill = (x: number): Op => ({ kind: 'fill', rect: { x, y: 0, w: 10, h: 10 } });

const empty = initialEditorState<Img>();
const loaded = (
  ops: Op[],
  unsaved: boolean,
  mode: 'fill' | 'mosaic' = 'fill',
): EditorState<Img> => ({
  status: 'loaded',
  mode,
  base: imgA,
  width: 100,
  height: 50,
  ops,
  unsaved,
});

describe('editorReducer', () => {
  it('初期状態は empty・黒塗り', () => {
    expect(empty).toEqual({ status: 'empty', mode: 'fill' });
  });

  it('UT-RED-01：empty で LOAD → loaded、ops = []、unsaved = false', () => {
    expect(editorReducer(empty, { type: 'LOAD', base: imgA, width: 100, height: 50 })).toEqual(
      loaded([], false),
    );
  });

  it('UT-RED-02：loaded（ops 3件・unsaved）で LOAD → 新しい画像、ops = []、unsaved = false、mode は引き継ぐ', () => {
    const before = loaded([fill(1), fill(2), fill(3)], true, 'mosaic');
    const after = editorReducer(before, { type: 'LOAD', base: imgB, width: 30, height: 20 });
    expect(after).toEqual({
      status: 'loaded',
      mode: 'mosaic',
      base: imgB,
      width: 30,
      height: 20,
      ops: [],
      unsaved: false,
    });
  });

  it('UT-RED-03：ADD_OP → ops の末尾に追加、unsaved = true', () => {
    const after = editorReducer(loaded([fill(1)], false), { type: 'ADD_OP', op: fill(2) });
    expect(after).toMatchObject({ ops: [fill(1), fill(2)], unsaved: true });
  });

  it('UT-RED-04：ops 2件で UNDO → 1件、unsaved = true', () => {
    const after = editorReducer(loaded([fill(1), fill(2)], false), { type: 'UNDO' });
    expect(after).toMatchObject({ ops: [fill(1)], unsaved: true });
  });

  it('UT-RED-05：ops 0件で UNDO → 状態が変わらない（同じオブジェクト）', () => {
    const before = loaded([], false);
    expect(editorReducer(before, { type: 'UNDO' })).toBe(before);
  });

  it('UT-RED-06：EXPORTED → unsaved = false、ほかは変わらない', () => {
    const before = loaded([fill(1)], true);
    const ops = before.status === 'loaded' ? before.ops : [];
    expect(editorReducer(before, { type: 'EXPORTED', ops })).toEqual({ ...before, unsaved: false });
  });

  it('UT-RED-06：保存済みで EXPORTED → 同じオブジェクト', () => {
    const before = loaded([fill(1)], false);
    const ops = before.status === 'loaded' ? before.ops : [];
    expect(editorReducer(before, { type: 'EXPORTED', ops })).toBe(before);
  });

  describe('UT-RED-11：書き出しの完了前に状態が替わった EXPORTED は、未保存のまま', () => {
    /** 書き出しを始めた時点の状態と、その ops */
    const start = () => {
      const s = editorReducer(loaded([fill(1)], false), { type: 'ADD_OP', op: fill(2) });
      return { s, ops: s.status === 'loaded' ? s.ops : [] };
    };

    it('完了前に黒塗りを追加', () => {
      const { s, ops } = start();
      const edited = editorReducer(s, { type: 'ADD_OP', op: fill(3) });
      expect(editorReducer(edited, { type: 'EXPORTED', ops })).toBe(edited);
    });

    it('完了前に元に戻す', () => {
      const { s, ops } = start();
      const undone = editorReducer(s, { type: 'UNDO' });
      expect(editorReducer(undone, { type: 'EXPORTED', ops })).toBe(undone);
    });

    it('完了前に元に戻して、同じ件数まで編集し直した（件数が同じでも未保存のまま）', () => {
      const { s, ops } = start();
      const redone = editorReducer(editorReducer(s, { type: 'UNDO' }), {
        type: 'ADD_OP',
        op: fill(9),
      });
      expect(editorReducer(redone, { type: 'EXPORTED', ops })).toBe(redone);
      expect(redone.status === 'loaded' && redone.unsaved).toBe(true);
    });

    it('完了前に別の画像を読み込んで編集', () => {
      const { s, ops } = start();
      const next = editorReducer(
        editorReducer(s, { type: 'LOAD', base: imgB, width: 10, height: 10 }),
        { type: 'ADD_OP', op: fill(1) },
      );
      expect(editorReducer(next, { type: 'EXPORTED', ops })).toBe(next);
    });
  });

  it('UT-RED-07：CLEAR → empty、mode は引き継ぐ', () => {
    expect(editorReducer(loaded([fill(1)], true, 'mosaic'), { type: 'CLEAR' })).toEqual({
      status: 'empty',
      mode: 'mosaic',
    });
  });

  it.each([
    { type: 'ADD_OP', op: fill(1) },
    { type: 'UNDO' },
    { type: 'EXPORTED', ops: [] },
    { type: 'CLEAR' },
  ] as const)('UT-RED-08：empty で $type → 状態が変わらない', (action) => {
    expect(editorReducer(empty, action)).toBe(empty);
  });

  it('UT-RED-09：SET_MODE は empty・loaded の両方で mode だけ変わる', () => {
    expect(editorReducer(empty, { type: 'SET_MODE', mode: 'mosaic' })).toEqual({
      status: 'empty',
      mode: 'mosaic',
    });
    const before = loaded([fill(1)], true);
    expect(editorReducer(before, { type: 'SET_MODE', mode: 'mosaic' })).toEqual({
      ...before,
      mode: 'mosaic',
    });
  });

  it('UT-RED-09：同じ mode を SET_MODE → 同じオブジェクト', () => {
    expect(editorReducer(empty, { type: 'SET_MODE', mode: 'fill' })).toBe(empty);
  });

  it('UT-RED-10：前の状態のオブジェクトと配列を書き換えない', () => {
    const ops = [fill(1), fill(2)];
    const before = loaded(ops, false);
    const snapshot = structuredClone(before);
    editorReducer(before, { type: 'ADD_OP', op: fill(3) });
    editorReducer(before, { type: 'UNDO' });
    editorReducer(before, { type: 'EXPORTED', ops });
    editorReducer(before, { type: 'SET_MODE', mode: 'mosaic' });
    editorReducer(before, { type: 'CLEAR' });
    expect(before).toEqual(snapshot);
    expect(before.status === 'loaded' && before.ops).toBe(ops);
  });
});
