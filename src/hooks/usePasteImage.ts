import { useEffect } from 'react';
import { pickImageFromClipboard } from '../lib/browser/pickImage';

type Options = {
  /** acceptsInput（ダイアログ表示中・ドラッグ中は false） */
  enabled: boolean;
  onImage: (file: File) => void;
  onNoImage: () => void;
};

/**
 * 貼り付けで読み込む（F-01、docs/02 の 3.1）。document の paste イベントを使う。
 * navigator.clipboard.read() は権限の確認が出るため使わない。
 */
export function usePasteImage({ enabled, onImage, onNoImage }: Options) {
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = pickImageFromClipboard(event.clipboardData);
      if (file) {
        event.preventDefault();
        onImage(file);
      } else {
        onNoImage();
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enabled, onImage, onNoImage]);
}
