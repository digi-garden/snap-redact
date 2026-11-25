import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastKind = 'success' | 'info' | 'error';
export type ToastState = { id: number; kind: ToastKind; text: string };
export type ShowToast = (kind: ToastKind, text: string) => void;

/** 表示時間（docs/01 の 5.1）：成功・情報は 2.5 秒、エラーは 4 秒 */
export const TOAST_DURATION_MS: Record<ToastKind, number> = {
  success: 2500,
  info: 2500,
  error: 4000,
};

/** トースト（F-12）。同時に出すのは1件だけで、新しいものが来たら置き換える */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showToast = useCallback<ShowToast>((kind, text) => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, kind, text });
    timer.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS[kind]);
  }, []);

  return { toast, showToast, dismiss };
}
