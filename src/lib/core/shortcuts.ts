// キー操作の判定（docs/02-functional-design.md 4章）。keydown の値と画面の状態から、何をするかを決める純粋関数。

/** keydown のうち判定に使う値（KeyboardEvent から写す。lib/core は DOM の型を使えない） */
export type KeyInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  /** 日本語入力の変換を確定した直後などに来る 229（isComposing が false のブラウザがある） */
  keyCode?: number;
};

export type KeyContext = {
  isModalOpen: boolean;
  isDragging: boolean;
  canUndo: boolean;
  canExport: boolean;
  /** ページ内で文字が選択されているか（Ctrl+C を既定のコピーに任せる） */
  hasTextSelection: boolean;
};

export type KeyCommand = 'cancelDrag' | 'undo' | 'copy' | 'modeFill' | 'modeMosaic';

/**
 * keydown → 動作。何もしないときは null（既定動作も止めない）。
 * ダイアログ表示中の Esc は、ダイアログ（ネイティブの <dialog> の cancel）が閉じるので、ここでは扱わない。
 */
export function decideShortcut(e: KeyInput, ctx: KeyContext): KeyCommand | null {
  // 1. 日本語入力の変換中
  if (e.isComposing || e.keyCode === 229) return null;
  // 2. ダイアログ表示中
  if (ctx.isModalOpen) return null;

  const key = e.key.toLowerCase(); // Caps Lock 中は 'B' が来る
  const mod = e.ctrlKey || e.metaKey;

  // 3. Esc でドラッグを破棄
  if (key === 'escape') return ctx.isDragging ? 'cancelDrag' : null;
  if (ctx.isDragging) return null; // ドラッグ中はほかの操作を受け付けない

  // 4. Ctrl+Z / ⌘Z（Shift 付きはやり直しの慣習なので扱わない）
  if (mod && !e.shiftKey && !e.altKey && key === 'z') return ctx.canUndo ? 'undo' : null;
  // 5. Ctrl+C / ⌘C（文字を選択しているときは既定のコピー）
  if (mod && !e.shiftKey && !e.altKey && key === 'c') {
    return ctx.canExport && !ctx.hasTextSelection ? 'copy' : null;
  }
  // 6. B / M（修飾キーなし）
  if (!mod && !e.altKey && !e.shiftKey) {
    if (key === 'b') return 'modeFill';
    if (key === 'm') return 'modeMosaic';
  }
  return null;
}
