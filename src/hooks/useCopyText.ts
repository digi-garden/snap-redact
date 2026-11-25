import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/browser/copyText';

/** テキストをコピーし、成功したら数秒だけ copied を true にする（DL-02 のコードのコピー） */
export function useCopyText(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      if ((await copyText(text)) !== 'ok') return;
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs],
  );

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}
