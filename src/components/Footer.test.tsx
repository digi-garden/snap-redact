import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '../messages';
import { Footer } from './Footer';

describe('Footer', () => {
  it('既存2作と同じ順に並び、「安全性とプライバシー」で確かめ方（DL-02）を開く', () => {
    const onOpenSafety = vi.fn();
    render(<Footer onOpenSafety={onOpenSafety} />);
    const policy = screen.getByRole('navigation', { name: messages.footer.policyLabel });
    expect(Array.from(policy.children).map((el) => el.textContent)).toEqual([
      messages.footer.safety,
      messages.footer.licenses,
      messages.footer.terms,
      messages.footer.privacy,
    ]);
    fireEvent.click(screen.getByRole('button', { name: messages.footer.safety }));
    expect(onOpenSafety).toHaveBeenCalledTimes(1);
  });
});
