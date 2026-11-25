// テスト共通のセットアップ。Vitest のグローバル関数を使わない設定のため、
// Testing Library の後片付け（描画した部品の破棄）を明示的に登録する。
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
