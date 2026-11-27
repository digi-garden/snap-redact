// 編集状態の遷移（docs/02-functional-design.md 2.2）
// 純粋関数。元画像の close() や描画などの副作用は reducer の外（hooks）で行う。
// 状態が変わらないときは、同じオブジェクトを返す（React の再描画を避けるため）。
import type { EditorAction, EditorState } from './types';

export function initialEditorState<TImage>(): EditorState<TImage> {
  return { status: 'empty', mode: 'fill' };
}

export function editorReducer<TImage>(
  state: EditorState<TImage>,
  action: EditorAction<TImage>,
): EditorState<TImage> {
  switch (action.type) {
    case 'LOAD':
      // 画像の差し替えでも mode は引き継ぐ。操作の履歴は捨てる（IN-5）
      return {
        status: 'loaded',
        mode: state.mode,
        base: action.base,
        width: action.width,
        height: action.height,
        ops: [],
        unsaved: false,
      };

    case 'SET_MODE':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };

    case 'ADD_OP':
      if (state.status !== 'loaded') return state;
      return { ...state, ops: [...state.ops, action.op], unsaved: true };

    case 'UNDO':
      if (state.status !== 'loaded' || state.ops.length === 0) return state;
      return { ...state, ops: state.ops.slice(0, -1), unsaved: true };

    case 'EXPORTED':
      if (state.status !== 'loaded' || !state.unsaved) return state;
      // 書き出しの完了前に ops が替わった（編集・元に戻す・読み込み）なら、書き出したのは古い内容なので未保存のまま
      if (state.ops !== action.ops) return state;
      return { ...state, unsaved: false };

    case 'CLEAR':
      if (state.status !== 'loaded') return state;
      return { status: 'empty', mode: state.mode };
  }
}
