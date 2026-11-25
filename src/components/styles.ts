// ボタンなどの共通のクラス（docs/01-screen-design.md 7章）

/** キーボード操作のときだけ出るフォーカスの輪（アクセントカラー 2px） */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400';

/** スマホ（幅 640px 未満、またはタッチ操作が主）ではボタンの高さを 44px 以上にする（docs/01 の 8章） */
const touchTarget = 'max-sm:min-h-11 pointer-coarse:min-h-11';

const buttonBase = `inline-flex items-center gap-2 rounded-md text-sm transition-colors disabled:cursor-not-allowed ${touchTarget} ${focusRing}`;

/** 主ボタン：アクセントカラーで塗る。文字は zinc-950（コントラストのため） */
export const primaryButton = `${buttonBase} bg-emerald-500 px-[18px] py-2.5 font-semibold text-zinc-950 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600`;

/** 副ボタン：枠のみ */
export const secondaryButton = `${buttonBase} border border-zinc-700 px-[18px] py-2.5 text-zinc-200 hover:bg-zinc-800 disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent`;

/** ツールバーの小さいボタン */
export const toolButton = `${buttonBase} border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent`;

/** 黒塗り／モザイクの切り替え（2つで1組） */
export const segmentButton = (selected: boolean) =>
  `${buttonBase} rounded-none px-3 py-1.5 ${
    selected
      ? 'bg-emerald-500 font-semibold text-zinc-950'
      : 'bg-transparent text-zinc-200 hover:bg-zinc-800'
  }`;

/** キー表記の小さな文字 */
export const keyHint = 'text-xs font-normal opacity-75';
