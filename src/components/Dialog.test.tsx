import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

// 親が open を管理する、実際の使い方と同じ形
function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      title="タイトル"
    >
      <button type="button" data-autofocus>
        閉じる
      </button>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('Esc（cancel）で onClose が1回だけ呼ばれる（P2 レビュー #2）', () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);
    const dialog = container.querySelector('dialog');
    expect(dialog).not.toBeNull();
    act(() => {
      fireEvent(dialog as HTMLDialogElement, new Event('cancel', { cancelable: true }));
    });
    // 親が open=false にしたあと dialog.close() でネイティブの close イベントが出ても、もう呼ばれない
    act(() => {
      fireEvent(dialog as HTMLDialogElement, new Event('close'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('背景（dialog 要素自体）のクリックで閉じ、中身のクリックでは閉じない', () => {
    const onClose = vi.fn();
    const { container, getByRole } = render(<Harness onClose={onClose} />);
    fireEvent.click(getByRole('button', { name: '閉じる', hidden: true }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('dialog') as HTMLDialogElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('タイトルでダイアログに名前が付く', () => {
    const { container, getByText } = render(<Harness onClose={vi.fn()} />);
    const dialog = container.querySelector('dialog');
    expect(dialog?.getAttribute('aria-labelledby')).toBe(getByText('タイトル').id);
  });
});
