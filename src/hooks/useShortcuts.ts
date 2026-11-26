import { useEffect, useRef } from 'react';
import { decideShortcut, type KeyCommand } from '../lib/core/shortcuts';

type Options = {
  isModalOpen: boolean;
  isDragging: boolean;
  canUndo: boolean;
  canExport: boolean;
  /** 動作ごとの処理。登録していない動作は何もしない（既定動作も止めない） */
  handlers: Partial<Record<KeyCommand, () => void>>;
};

/**
 * キー操作（docs/02 の 4章）。window の keydown を一度だけ購読し、判定は lib/core/shortcuts.ts に任せる。
 * 処理が登録されている動作だけ preventDefault() して実行する。
 */
export function useShortcuts(options: Options) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { handlers, ...state } = latest.current;
      const command = decideShortcut(event, {
        ...state,
        hasTextSelection: (window.getSelection()?.toString() ?? '') !== '',
      });
      const handler = command ? handlers[command] : undefined;
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
