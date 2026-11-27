// ボタンなどの共通のクラス（docs/01-screen-design.md 7章、CircleNote デザインガイドライン）

/** 横幅をそろえる入れ物（ヘッダー・本文・フッターで共通。CircleNote ガイドライン 4章） */
export const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

/** キーボード操作のときだけ出るフォーカスの輪（3px、3px 離す。CircleNote ガイドライン 5章） */
export const focusRing =
  'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cn-focus';

/** スマホ（幅 640px 未満、またはタッチ操作が主）ではボタンの高さを 44px 以上にする（docs/01 の 8章） */
export const touchTarget = 'max-sm:min-h-11 pointer-coarse:min-h-11';

const buttonBase = `inline-flex items-center gap-2 rounded-md text-sm transition-colors disabled:cursor-not-allowed ${touchTarget} ${focusRing}`;

/** 押せないときの見た目（文字を薄くし、枠と地を目立たなくする） */
const disabledLook =
  'disabled:border-cn-border disabled:bg-transparent disabled:text-cn-text-subtle disabled:opacity-60';

/** 主ボタン：アクセントカラーで塗る。文字は cn-on-accent（コントラストのため） */
export const primaryButton = `${buttonBase} bg-cn-accent px-[18px] py-2.5 font-semibold text-cn-on-accent hover:bg-cn-accent-hover disabled:bg-cn-border disabled:text-cn-text-subtle disabled:opacity-60`;

/** 副ボタン：枠のみ */
export const secondaryButton = `${buttonBase} border border-cn-border-strong px-[18px] py-2.5 text-cn-text hover:bg-cn-border ${disabledLook}`;

/** ツールバーの小さいボタン */
export const toolButton = `${buttonBase} border border-cn-border-strong px-3 py-1.5 text-cn-text hover:bg-cn-border ${disabledLook}`;

/**
 * 黒塗り／モザイクの切り替え（2つで1組）。
 * 外枠に overflow-hidden を使うとフォーカスの輪が切れるので、両端のボタンの角を個別に丸める
 */
export const segmentButton = (selected: boolean) =>
  `${buttonBase} rounded-none first:rounded-l-[5px] last:rounded-r-[5px] px-3 py-1.5 ${
    selected
      ? 'bg-cn-accent font-semibold text-cn-on-accent'
      : 'bg-transparent text-cn-text hover:bg-cn-border'
  }`;

/** キー表記の小さな文字 */
export const keyHint = 'text-xs font-normal opacity-75';

/** 本文中のリンク（フッター・ダイアログ） */
export const textLink = `rounded-sm text-cn-link underline underline-offset-2 hover:text-cn-accent-hover ${focusRing}`;
