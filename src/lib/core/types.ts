// 編集状態の型（docs/02-functional-design.md 2.1）
// lib/core は DOM の型を使えない（tsconfig.core.json）。元画像（ImageBitmap）は型引数で受け取る。

export type Mode = 'fill' | 'mosaic';

/** 画像の原寸座標。小数を含みうる（docs/02 の 3.5.1） */
export type Point = { x: number; y: number };

/** 画像の原寸座標。x, y, w, h はすべて整数、w, h は 1 以上（docs/02 の 3.5.2） */
export type Rect = { x: number; y: number; w: number; h: number };

export type Op = { kind: 'fill'; rect: Rect } | { kind: 'mosaic'; rect: Rect; blockSize: number };

export type EditorState<TImage> =
  | { status: 'empty'; mode: Mode }
  | {
      status: 'loaded';
      mode: Mode;
      /** 元画像（読み込み時のまま変更しない）。実体は ImageBitmap */
      base: TImage;
      width: number;
      height: number;
      /** 操作の履歴（古い順） */
      ops: Op[];
      /** 最後のコピー／ダウンロード以降に操作があるか */
      unsaved: boolean;
    };

/** 状態遷移のアクション（docs/02 の 2.2） */
export type EditorAction<TImage> =
  | { type: 'LOAD'; base: TImage; width: number; height: number }
  | { type: 'ADD_OP'; op: Op }
  | { type: 'UNDO' }
  | { type: 'CLEAR' }
  | { type: 'EXPORTED' }
  | { type: 'SET_MODE'; mode: Mode };
