import { Component, type ErrorInfo, type ReactNode } from 'react';
import { messages } from '../messages';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * 想定外の例外を受け止める（docs/02 の 5章）。
 * 画面全体を案内に切り替え、エラーの内容は Console に出すだけで、外部には送らない。
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[snap-redact] 想定外のエラー', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    const t = messages.crashed;
    return (
      <div role="alert" className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-cn-border bg-cn-surface p-6">
          <h1 className="text-lg font-semibold text-cn-error">{t.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-cn-text-muted">{t.body}</p>
        </div>
      </div>
    );
  }
}
