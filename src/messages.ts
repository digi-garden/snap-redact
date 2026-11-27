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

  /** 想定外のエラー（docs/02 の 5章）。再読み込みのボタンは置かない（location の参照を禁止しているため） */
  crashed: {
    title: '問題が発生しました',
    body: 'ページを再読み込みしてください（F5 キー、または ⌘R）。画像はこのタブの中だけにあったため、編集内容は失われます。',
  },

  /** CircleNote の共通シェル（brand-assets の templates/circlenote） */
  brand: 'CircleNote',

  footer: {
    toolsLabel: 'CircleNoteの他のツール',
    maskUnmaskLead: 'テキストの機密を隠すなら →',
    maskUnmask: 'Mask & Unmask',
    contextPacker: 'Context-Packer',
    vramCalculator: 'VRAM Calculator',
    policyLabel: '利用規約・プライバシー等',
    licenses: 'OSSライセンス',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    github: 'GitHub',
    disclaimer: '隠し漏れの最終確認は利用者が行ってください',
    by: 'by',
    provider: 'digi-garden',
    copyright: '© 2026 digi-garden',
  },

  /** トースト（docs/01 の 5.1） */
  toast: {
    noImage: '画像が見つかりませんでした', // TS-01
    unsupported: 'この形式には対応していません（PNG / JPEG / WebP / GIF）', // TS-02
    decodeFailed: '画像を読み込めませんでした', // TS-03
    tooLarge: (maxEdge: number) =>
      `画像が大きすぎます（長辺 ${maxEdge.toLocaleString('ja-JP')}px まで）`, // TS-04
    cannotProcess: 'この画像は大きすぎて処理できません', // TS-05
    copied: 'コピーしました。そのまま貼り付けできます', // TS-06
    copyFailed: 'コピーできませんでした。ダウンロードをご利用ください', // TS-07
    downloaded: 'redacted_image.png を保存しました', // TS-08
    gifFirstFrame: 'GIF は最初のコマだけを読み込みました', // TS-09
    close: '通知を閉じる',
  },

  /** アクションバーの情報表示（docs/01 の 3.4） */
  imageInfo: (width: number, height: number, ops: number) =>
    `${width} × ${height} px ・ 操作 ${ops} 件`,

  /** キャンバスの読み上げ名（docs/01 の 9章） */
  canvasLabel: '編集中の画像',

  /** NT-01 */
  mosaicNotice: '文字には黒塗りを推奨（モザイクは復元されうる）',
  /** NT-02 */
  mobileNotice: 'PC 向けツールです。スマホはファイル選択のみ対応しています',
  mobileNoticeClose: '案内を閉じる',

  /** DL-01（docs/01 の 4.1） */
  replace: {
    title: '編集中の画像を差し替えますか？',
    body: 'コピーもダウンロードもしていない編集内容は破棄されます。',
    cancel: 'キャンセル',
    confirm: '差し替える',
  },

  /** ファイルを重ねているときの表示（docs/01 の 3.3） */
  dropHere: 'ここにドロップ',

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
