// 画面の文言（docs/01-screen-design.md 3〜5章）。コンポーネントに直接書かず、ここにまとめる。
// ID は画面設計書のメッセージ一覧と対応させる。

export type KeyLabels = {
  /** Ctrl（Windows など）または ⌘（Mac） */
  mod: string;
};

export const messages = {
  appName: 'Snap-Redact',
  tagline: 'スクショを貼る前の5秒前処理',

  badge: {
    label: '外部通信ブロック中（CSP）',
    shortLabel: '通信ブロック中（CSP）',
    tooltip: '通信をブロックしている仕組みと確かめ方',
  },

  toolbar: {
    fill: '黒塗り',
    mosaic: 'モザイク',
    undo: '元に戻す',
    clear: 'クリア',
    undoTooltip: (k: KeyLabels) => `元に戻す（${k.mod}+Z）`,
  },

  empty: {
    pasteKey: (k: KeyLabels) => `${k.mod}+V`,
    pasteTitle: 'でスクショを貼り付け',
    dropOr: 'または画像をドロップ ／',
    choose: '画像を選択',
    privacy: '画像はこのタブの中だけで処理され、送信も保存もされません',
  },

  actions: {
    copy: '画像をコピー',
    copyKey: (k: KeyLabels) => `${k.mod}+C`,
    download: 'ダウンロード',
    notLoaded: '画像が読み込まれていません',
  },

  footer: {
    maskUnmaskLead: 'テキストの機密を隠すなら →',
    maskUnmask: 'Mask & Unmask',
    github: 'GitHub',
    disclaimer: '隠し漏れの最終確認は利用者が行ってください',
    copyright: '© digi-garden',
  },

  /** NT-01 */
  mosaicNotice: '文字には黒塗りを推奨（モザイクは復元されうる）',
  /** NT-02 */
  mobileNotice: 'PC 向けツールです。スマホはファイル選択のみ対応しています',
  mobileNoticeClose: '案内を閉じる',

  /** DL-02 */
  verify: {
    title: '外部通信をブロックしている仕組み',
    body: [
      "このページは、ブラウザの仕組み（CSP: connect-src 'none'）で外部への通信を禁止しています。これは画面上の表示ではなく、サーバーが返すレスポンスヘッダーによる設定です。",
      '画像はこのタブのメモリ上でだけ処理され、どこにも送信・保存されません。',
    ],
    howTo: '自分で確かめる方法',
    steps: [
      'F12 で DevTools を開き、Network タブを表示する',
      '画像を貼り付けて黒塗りし、コピーする',
      'ページ本体の読み込み以外に通信がないことを確認する',
      'Console で次を実行すると、CSP によりブロックされる',
      'Network タブでページ本体を選び、Response Headers の Content-Security-Policy を確認する',
    ],
    fetchCode: "fetch('https://example.com')",
    copyCode: 'コピー',
    copiedCode: 'コピーしました',
    extensionNote:
      'ブラウザの拡張機能はページの内容を読めるため、この仕組みでは防げません。信頼できない拡張機能は無効にしてお使いください。',
    source: 'ソースコード：',
    sourceLabel: 'github.com/digi-garden/snap-redact',
    close: '閉じる',
  },
} as const;
