// 状態から決まる値（docs/02-functional-design.md 2.4）
import type { EditorState } from './types';

/** 元に戻せるか（元に戻すボタン、Ctrl+Z） */
export function canUndo(state: EditorState<unknown>): boolean {
  return state.status === 'loaded' && state.ops.length > 0;
}

/** コピー・ダウンロード・クリアができるか */
export function canExport(state: EditorState<unknown>): boolean {
  return state.status === 'loaded';
}

/** 新しい画像を受け取ったときに、差し替えの確認（DL-01）が要るか（IN-5） */
export function needsReplaceConfirm(state: EditorState<unknown>): boolean {
  return state.status === 'loaded' && state.unsaved && state.ops.length > 0;
}

/** 貼り付け・ドロップ・ファイル選択を受け付けるか（docs/02 の 3.1〜3.3 の共通ガード） */
export function acceptsInput(ui: { isModalOpen: boolean; isDragging: boolean }): boolean {
  return !ui.isModalOpen && !ui.isDragging;
}
