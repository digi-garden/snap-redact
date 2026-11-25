import { useMemo, useSyncExternalStore } from 'react';
import { isMac, isMobileLike, onMobileLikeChange } from '../lib/browser/platform';
import type { KeyLabels } from '../messages';

export type Platform = {
  /** キー表記（Ctrl / ⌘） */
  keys: KeyLabels;
  /** スマホなど（幅 768px 未満、またはタッチ操作が主） */
  mobileLike: boolean;
};

/** キー表記とスマホ判定（docs/01 の 3.2・8章）。画面幅の変化に追従する */
export function usePlatform(): Platform {
  const mobileLike = useSyncExternalStore(onMobileLikeChange, () => isMobileLike());
  const keys = useMemo<KeyLabels>(() => ({ mod: isMac() ? '⌘' : 'Ctrl' }), []);
  return { keys, mobileLike };
}
