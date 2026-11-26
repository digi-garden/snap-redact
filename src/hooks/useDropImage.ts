import { useEffect, useRef, useState } from 'react';
import { pickImageFromDrop } from '../lib/browser/pickImage';

type Options = {
  /** acceptsInput（ダイアログ表示中・ドラッグ中は false） */
  enabled: boolean;
  onImage: (file: File) => void;
  onNoImage: () => void;
};

/** dataTransfer にファイルが含まれているか（文字列やリンクのドラッグには反応しない） */
function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * ドロップで読み込む（F-02、docs/02 の 3.2）。
 * - window で dragover / drop の既定動作を常に止める（キャンバスの外に落としてもページを離れない。IN-2）
 * - 子要素の間を移動すると dragenter と dragleave が対で発火するため、深さを数えて強調表示を決める
 * - dragleave の取りこぼしに備え、drop・dragend・blur・visibilitychange（hidden）で深さを 0 に戻す
 * - 強調表示は、ファイルを重ねていて、かつ受け付けられるときだけ出す（ダイアログ表示中は出さない）
 */
export function useDropImage({ enabled, onImage, onNoImage }: Options) {
  const [depth, setDepth] = useState(0);

  // イベントの購読は一度だけにし、最新の設定は ref から読む
  const latest = useRef({ enabled, onImage, onNoImage });
  useEffect(() => {
    latest.current = { enabled, onImage, onNoImage };
  }, [enabled, onImage, onNoImage]);

  useEffect(() => {
    const reset = () => setDepth(0);

    const onDragEnter = (event: DragEvent) => {
      event.preventDefault();
      if (hasFiles(event)) setDepth((d) => d + 1);
    };
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = latest.current.enabled ? 'copy' : 'none';
      }
    };
    const onDragLeave = (event: DragEvent) => {
      if (hasFiles(event)) setDepth((d) => Math.max(0, d - 1));
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      reset();
      const { enabled: ok, onImage: image, onNoImage: none } = latest.current;
      if (!ok) return;
      const file = pickImageFromDrop(event.dataTransfer);
      if (file) image(file);
      else none();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') reset();
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { isOver: depth > 0 && enabled };
}
