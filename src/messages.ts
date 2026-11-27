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

  /** ページ下部の用途・使い方・よくある質問（既存2作の下部の説明に合わせる。docs/01 の 3.6） */
  guide: {
    title: 'Snap-Redact の用途・使い方・よくある質問',
    useCaseTitle: '主な用途・使用例',
    maskUnmaskLead: 'テキストの機密を隠すなら →',
    maskUnmask: 'Mask & Unmask',
    useCase:
      'Slack・GitHub の Issue・生成 AI などにスクリーンショットを貼る前に、写り込んだメールアドレス・API キー・顧客名・社内の URL などを黒塗りやモザイクで隠せます。画像の読み込みから書き出しまで、ブラウザの中だけで処理します。',
    stepsTitle: '最短の利用手順',
    steps: (k: KeyLabels) => [
      `スクリーンショットを撮り、このページで ${k.mod}+V を押して貼り付けます（ファイルのドロップや「画像を選択」でも読み込めます）。`,
      `隠したい部分をドラッグします。B で黒塗り、M でモザイクに切り替え、間違えたら ${k.mod}+Z で1件ずつ戻せます。`,
      `${k.mod}+C（または「画像をコピー」）でコピーし、貼り付け先にそのまま貼ります。ファイルが必要なときは「ダウンロード」で保存します。`,
    ],
    notesTitle: '利用上の注意点',
    notes: [
      '文字や数字には黒塗りを使ってください。モザイクは、文字の大きさや種類によっては推測・復元されることがあります。',
      '隠し漏れの最終確認は利用者が行ってください。貼り付ける前に、出力を目で確かめてください。',
      'ブラウザの拡張機能はページの内容を読めるため、この仕組みでは防げません。信頼できない拡張機能は無効にしてお使いください。',
      'ページを閉じたり再読み込みしたりすると、編集中の画像は消えます（どこにも保存しません）。',
    ],
    faqTitle: 'よくある質問（FAQ）',
    sourceLead: 'ソースコード：',
    source: 'github.com/digi-garden/snap-redact',
    faq: [
      {
        q: 'Q. 画像はサーバーへ送信されますか？',
        a: "いいえ。処理はすべてご利用のブラウザの中で行い、ブラウザの仕組み（CSP の connect-src 'none'）で外部への通信そのものを禁止しています。画面右上の「外部通信ブロック中（CSP）」から、DevTools で確かめる手順を開けます。",
      },
      {
        q: 'Q. 黒塗りした画像から、元の文字を取り出されることはありますか？',
        a: '黒塗りは不透明の黒で画素を上書きし、出力はその画素から書き出した PNG なので、元の画素や撮影情報（EXIF）は含まれません。範囲は外側に丸めるため、ドラッグした範囲より狭くなることもありません。',
      },
      {
        q: 'Q. コピーした画像を貼り付けられません。',
        a: 'ブラウザや貼り付け先によっては、画像のコピーに対応していない場合があります。その場合は「ダウンロード」でファイルとして保存し、添付してください。',
      },
      {
        q: 'Q. スマホでも使えますか？',
        a: 'PC での利用を想定しています。スマホでは、画像の選択とダウンロードだけに対応しています。',
      },
    ],
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
    maskUnmask: 'Mask & Unmask',
    contextPacker: 'Context-Packer',
    vramCalculator: 'VRAM Calculator',
    policyLabel: '利用規約・プライバシー等',
    safety: '安全性とプライバシー',
    licenses: 'OSSライセンス',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
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
