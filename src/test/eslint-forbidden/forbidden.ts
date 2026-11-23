// ESLint の禁止ルールのテスト用ファイル（docs/06-test-design.md 2.3）。
// 各行末の「expect:」に、その行で出るべきルールを書く。scripts/eslint-rules.test.mjs が確かめる。
// 通常の lint の対象からは外している（eslint.config.js の ignores）。アプリからは読み込まない。
/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-implied-eval */

export function forbidden(url: string, data: string): void {
  // 通信
  fetch(url); // expect: no-restricted-globals
  self.fetch(url); // expect: no-restricted-properties
  globalThis.fetch(url); // expect: no-restricted-properties
  window.fetch(url); // expect: no-restricted-properties
  void (window as unknown as Record<string, unknown>)['fetch']; // expect: no-restricted-syntax
  new XMLHttpRequest(); // expect: no-restricted-globals
  new WebSocket(url); // expect: no-restricted-globals
  new EventSource(url); // expect: no-restricted-globals
  navigator.sendBeacon(url, data); // expect: no-restricted-properties

  // 保存
  localStorage.setItem('k', data); // expect: no-restricted-globals
  sessionStorage.setItem('k', data); // expect: no-restricted-globals
  void window.indexedDB; // expect: no-restricted-properties
  void caches; // expect: no-restricted-globals

  // 遷移
  location.href = url; // expect: no-restricted-globals
  window.location.href = url; // expect: no-restricted-properties
  document.location.href = url; // expect: no-restricted-properties
  location = url as unknown as Location; // expect: no-restricted-globals
  window.location.assign(url); // expect: no-restricted-properties
  open(url); // expect: no-restricted-globals
  globalThis.open(url); // expect: no-restricted-properties
  window.open(url); // expect: no-restricted-properties

  // その他
  eval(data); // expect: no-eval
  new Function(data); // expect: no-new-func
  void navigator.serviceWorker; // expect: no-restricted-properties
}
