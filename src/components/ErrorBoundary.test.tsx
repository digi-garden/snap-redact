import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages } from '../messages';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('子で例外が出たら案内に切り替え、内容は Console にだけ出す', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain(messages.crashed.title);
    expect(consoleError.mock.calls.some((args) => args[0] === '[snap-redact] 想定外のエラー')).toBe(
      true,
    );
  });

  it('例外がなければ子をそのまま表示する', () => {
    render(
      <ErrorBoundary>
        <p>ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok').textContent).toBe('ok');
  });
});
