// 端末の判定（docs/03-architecture.md 5.4）。キー表記（Ctrl / ⌘）とスマホ向け案内（NT-02）に使う。

type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } };

/** Mac（と iPad などの Apple 製端末）なら true。キー表記を ⌘ にする */
export function isMac(nav: Navigator = navigator): boolean {
  const platform = (nav as NavigatorWithUAData).userAgentData?.platform ?? nav.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** 幅 768px 未満、またはタッチ操作が主の端末（docs/01 の 8章） */
export const MOBILE_QUERY = '(max-width: 767px), (pointer: coarse)';

/** 幅 768px 未満、またはタッチ操作が主の端末なら true */
export function isMobileLike(win: Pick<Window, 'matchMedia'> = window): boolean {
  return win.matchMedia(MOBILE_QUERY).matches;
}

/** 画面幅などが変わって isMobileLike の結果が変わりうるときに呼ばれる。解除用の関数を返す */
export function onMobileLikeChange(
  callback: () => void,
  win: Pick<Window, 'matchMedia'> = window,
): () => void {
  const mql = win.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}
