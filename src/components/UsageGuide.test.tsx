import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { messages } from '../messages';
import { UsageGuide } from './UsageGuide';

describe('UsageGuide', () => {
  it('見出し・手順・FAQ を表示し、キーの表記は OS に合わせる', () => {
    render(<UsageGuide keys={{ mod: '⌘' }} />);
    expect(screen.getByRole('heading', { level: 2, name: messages.guide.title })).toBeTruthy();
    expect(screen.getAllByRole('listitem')[0]?.textContent).toContain('⌘+V');
    expect(screen.getAllByRole('term')).toHaveLength(messages.guide.faq.length);
  });
});
