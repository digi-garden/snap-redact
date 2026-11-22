# テスト設計書：Snap-Redact（MVP）v1.1

最終更新：2026-11-22 ／ 対象要件：`docs/requirements.md` v1.2 ／ 関連：`docs/01`〜`05`

* v1.0（2026-11-22）：初版
* v1.1（2026-11-22）：外部レビュー2回目を反映（`useImageLoader` のテスト追加、ESLint の検査用ファイルの内容、ダイアログ表示中の入力の手動確認、手動確認の作業時間の目安）

基本設計の資料 6/6。何を、どの段階で、どう確かめるかを定め、要件 → 設計 → テストの対応表で抜けを確認する。

---

## 1. テストの段階

| 段階 | 手段 | いつ | 何を確かめるか |
| :--- | :--- | :--- | :--- |
| 静的検査 | `tsc`、ESLint、Prettier | PR ごと（CI） | 型、依存のルール（03 の 4章）、外部通信・保存・遷移の禁止（04 の 3章） |
| 単体テスト | Vitest（jsdom） | PR ごと（CI） | `lib/core` の純粋な処理、`lib/canvas` の呼び出し順、`lib/browser` の分岐 |
| 成果物検査 | `check-dist.mjs` | PR ごと（CI） | CSP の設定、外部 URL・インラインスクリプト・`data:` がないこと（04 の 4章） |
| 秘密情報 | gitleaks | PR ごと（CI） | リポジトリに秘密情報がないこと |
| 手動確認（フェーズごと） | 実機のブラウザ | 各実装フェーズの終わり | そのフェーズで作った機能（4章の該当項目） |
| 公開前セルフチェック | 実機の4ブラウザ | 公開前に1回、本番デプロイ後に一部 | 4章の全項目 |

* E2E テスト（Playwright など）は MVP では作らない。クリップボードとファイルの受け渡しは自動化しにくく、20〜30時間の予算に見合わないため。公開後に必要になれば v2 で検討する
* jsdom は Canvas の描画を実装していないため、描画結果の画素は単体テストでは確かめない。画素は手動確認（4章）で確かめる

---

## 2. 単体テスト

### 2.1 方針

* テストファイルは対象と同じ場所に置く（`geometry.test.ts` など）
* Canvas は、呼ばれたメソッドと引数を記録するだけの偽物（フェイク）を自作して使う（`src/test/fakeCanvas.ts`）。描画ライブラリは入れない
* `lib/core` は分岐を網羅する（命令網羅 100% を目安にする）。カバレッジは計測して PR で見えるようにするが、数値で CI を落とすことはしない

### 2.2 テストケース

#### `lib/core/geometry.ts`（ED-1, ED-5, ED-6）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-GEO-01 | 縮小表示（表示 960px・原寸 1920px）で、表示座標 (100, 50) を変換 | 原寸 (200, 100) |
| UT-GEO-02 | 割り切れない縮小率（例：原寸 1919px・表示 1000px）での変換 | 小数のまま返る |
| UT-GEO-03 | 左上 → 右下のドラッグ | 正しい矩形 |
| UT-GEO-04 | 右下 → 左上のドラッグ | 03 と同じ矩形 |
| UT-GEO-05 | 始点 (10.7, 20.2)・終点 (50.1, 60.9) | x=10, y=20, w=41, h=41（外側に丸める） |
| UT-GEO-06 | 画像の外まではみ出したドラッグ | 画像の範囲に切り詰められる |
| UT-GEO-07 | 画像の完全に外側でのドラッグ | `null` |
| UT-GEO-08 | 幅 2px・高さ 2px | `null`（ED-6） |
| UT-GEO-09 | 幅 80px・高さ 2px | 有効な矩形（細い矩形は有効） |
| UT-GEO-10 | 幅 0（クリックだけ） | `null` |
| UT-GEO-11 | 整数化した矩形が、元の小数の範囲を必ず含む（ランダムな 1,000 組） | すべて含む |

#### `lib/core/editorReducer.ts`（02 の 2.2）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-RED-01 | empty で LOAD | loaded、ops = []、unsaved = false |
| UT-RED-02 | loaded（ops 3件、unsaved = true）で LOAD | 新しい画像、ops = []、unsaved = false、mode は引き継ぐ |
| UT-RED-03 | ADD_OP | ops の末尾に追加、unsaved = true |
| UT-RED-04 | ops 2件で UNDO | 1件になる、unsaved = true |
| UT-RED-05 | ops 0件で UNDO | 状態が変わらない（同じオブジェクトを返す） |
| UT-RED-06 | EXPORTED | unsaved = false、ほかは変わらない |
| UT-RED-07 | CLEAR | empty、mode は引き継ぐ |
| UT-RED-08 | empty で ADD_OP / UNDO / EXPORTED / CLEAR | 状態が変わらない |
| UT-RED-09 | SET_MODE（empty・loaded の両方） | mode だけ変わる |
| UT-RED-10 | 前の状態を書き換えていない（不変性） | 前の状態のオブジェクトと配列が変わっていない |

#### `lib/core/selectors.ts`（02 の 2.4）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-SEL-01 | `canUndo`：empty / loaded で ops 0件 / 1件 | false / false / true |
| UT-SEL-02 | `needsReplaceConfirm`：unsaved と ops の件数の組み合わせ4通り | unsaved = true かつ ops 1件以上のときだけ true |
| UT-SEL-03 | `acceptsInput`：ダイアログ・ドラッグの組み合わせ4通り | どちらもないときだけ true |

#### `lib/core/limits.ts`・`imageType.ts`・`mosaicBlock.ts`

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-LIM-01 | 長辺がちょうど `MAX_EDGE` | 上限内 |
| UT-LIM-02 | 長辺が `MAX_EDGE + 1` | 上限超え |
| UT-LIM-03 | 総画素数がちょうど / 1 超える | 上限内 / 上限超え |
| UT-TYP-01 | `image/png`・`image/jpeg`・`image/webp`・`image/gif` | 対応 |
| UT-TYP-02 | `image/bmp`・`image/svg+xml`・`text/plain`・空文字 | 非対応 |
| UT-MOS-01 | 800×600 / 1920×1080 / 3840×2160 | 16 / 22 / 43 |

#### `lib/core/shortcuts.ts`（02 の 4章）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-KEY-01 | 日本語入力の変換中の各キー | 何もしない |
| UT-KEY-02 | ダイアログ表示中の `Esc` / `Ctrl+Z` | ダイアログを閉じる / 何もしない |
| UT-KEY-03 | `Ctrl+Z` と `⌘Z`、Shift 付き | Shift なしだけ Undo |
| UT-KEY-04 | `Ctrl+C`：画像あり・選択なし・ドラッグなし | コピー |
| UT-KEY-05 | `Ctrl+C`：テキスト選択あり / 画像なし / ドラッグ中 | 何もしない（既定動作に任せる） |
| UT-KEY-06 | `B` / `M`、修飾キー付きの `B`、ドラッグ中の `B` | 切り替え / 何もしない / 何もしない |
| UT-KEY-07 | `Caps Lock` 中の `B`（`e.key = 'B'`） | 切り替え |

#### `lib/canvas`（フェイクの Canvas で呼び出しを確かめる）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-CNV-01 | `applyOp` で黒塗り | `fillStyle = '#000000'`、`fillRect` が整数の座標で呼ばれる |
| UT-CNV-02 | `applyOp` でモザイク | 作業用への縮小描画 → **`clearRect`（対象範囲）** → `imageSmoothingEnabled = false` → 拡大描画、の順で呼ばれる |
| UT-CNV-03 | `renderAll` | `clearRect` → `drawImage(base)` → 各 op の順 |
| UT-CNV-04 | `prepareCanvas` で `getContext` が `null` | `null` を返す |
| UT-CNV-05 | `prepareCanvas` で `drawImage` が例外 | `null` を返す |

#### `lib/browser`

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-BRW-01 | clipboardData の items が `[text/html, image/png]` | png の File を返す |
| UT-BRW-02 | items が `[text/plain]` だけ | `null` |
| UT-BRW-03 | image の item の `getAsFile()` が `null` | `null` |
| UT-BRW-04 | ドロップの files が `[text.txt, a.png, b.jpg]` | a.png を返す |
| UT-BRW-05 | `copyImage`：`ClipboardItem` がない | `'unsupported'` |
| UT-BRW-06 | `copyImage`：`write` が reject | `'failed'` |
| UT-BRW-07 | `copyImage`：`write` に渡す値が Blob ではなく Promise | Promise が渡される（Safari 対策） |
| UT-BRW-08 | `downloadImage`：`toBlob` が `null` | `'failed'` |

#### フック（`@testing-library/react` の `renderHook` を使う）

| ID | 内容 | 期待結果 |
| :--- | :--- | :--- |
| UT-HK-01 | `useImageLoader`：遅い読み込み A の後に速い読み込み B（デコードを偽物にして順番を制御） | B が表示され、A の ImageBitmap は `close()` される |
| UT-HK-02 | `useImageLoader`：`needsReplaceConfirm` が true で読み込み | DL-01 が開き、まだ LOAD されない |
| UT-HK-03 | `useImageLoader`：DL-01 でキャンセル | 差し替え待ちの `close()`、状態は変わらない |
| UT-HK-07 | `useImageLoader`：DL-01 で「差し替える」 | LOAD が発行され、新しい Canvas が差し込まれ、前の ImageBitmap が `close()` される |
| UT-HK-08 | `useImageLoader`：編集中に読み込んだ画像で `prepareCanvas` が `null` | TS-05 が出て、編集中の画像・ops・unsaved が変わらない。新しい ImageBitmap は `close()` される |
| UT-HK-04 | `useDropImage`：子要素の間を移動（dragenter → dragenter → dragleave） | 強調表示が消えない |
| UT-HK-05 | `useDropImage`：`dragleave` が来ないまま `blur` | 強調表示が消える |
| UT-HK-06 | `useDropImage`：ダイアログ表示中に重ねる | 強調表示が出ない |

* `@testing-library/react` は開発時だけの依存（実行時の依存は増えない）

### 2.3 ESLint の禁止ルールのテスト

* `src/test/eslint-forbidden/` に、禁止したコードを書いた検査用ファイルを置く。最低限、次を含める（04 の 3章）
  * 通信：`fetch(…)`、`self.fetch(…)`、`globalThis.fetch(…)`、`window["fetch"](…)`、`new XMLHttpRequest()`、`navigator.sendBeacon(…)`
  * 保存：`localStorage.setItem(…)`、`window.indexedDB`
  * 遷移：`location.href = …`、`window.location.href = …`、`document.location.href = …`、`location = …`、`window.location.assign(…)`、`open(…)`、`globalThis.open(…)`
  * その他：`<a href={x}>`、`dangerouslySetInnerHTML`、`eval(…)`
* テストで ESLint の API を使ってそのファイルを検査し、各ルールがエラーを出すことを確かめる（ルールの設定を誤って消したときに気づけるようにする）
* 通常の `lint` の対象からは外す
* ESLint の API で flat config を読み込む部分に手間取る場合は、1.5 時間を上限にして、`npx eslint <ファイル>` を子プロセスで実行して終了コードとメッセージを確かめる方式に切り替える

---

## 3. 成果物検査のテスト

* `check-dist.mjs` 自体も、わざと問題を入れた小さな `dist` もどき（外部 URL を含む JS、CSP のない `_headers` など）で失敗することを単体テストで確かめる

---

## 4. 手動確認

### 4.1 フェーズごとの確認と公開前セルフチェック

「フェーズ」の列は、その機能を作るフェーズの終わりに確かめる項目。公開前セルフチェックでは全項目を4ブラウザで確かめる。

| ID | 確認内容 | 手順・合格条件 | フェーズ |
| :--- | :--- | :--- | :--- |
| MT-01 | 貼り付け | スクショを `Ctrl+V` / `⌘V` で貼ると表示される | 入力 |
| MT-02 | Web 上の画像のコピー＆貼り付け | ブラウザで画像を右クリック → コピー → 貼り付けで表示される（`text/html` と画像が混ざるケース） | 入力 |
| MT-03 | ドロップ | キャンバスの上・外の両方に落として読み込める。ページを離れない | 入力 |
| MT-04 | ファイル選択 | 同じファイルを2回続けて選べる | 入力 |
| MT-05 | 非対応の入力 | テキストだけを貼る → TS-01。BMP を落とす → TS-02 | 入力 |
| MT-06 | 大きな画像 | DevTools のフルページスクショ（縦長）が読める。上限を超える画像で TS-04 が出て、ブラウザが固まらない | 入力 |
| MT-07 | GIF | アニメーション GIF で最初のコマが表示され、TS-09 が出る | 入力 |
| MT-08 | 黒塗りの端 | 縮小表示のまま文字を黒塗り → ダウンロード → 画像編集ソフトで拡大し、黒の境界に中間色の画素がなく、文字の端がはみ出していない | 編集 |
| MT-09 | 細い矩形 | 横長で高さ 2px 程度の線を黒塗りできる | 編集 |
| MT-10 | モザイク | ブロックが大きく、文字が読めない。NT-01 が出る | 編集 |
| MT-11 | 透過画像のモザイク | 透過 PNG の文字にモザイク → ダウンロード → 白・黒の背景に重ねて見ても文字が透けない | 編集 |
| MT-12 | Undo・クリア | Undo で1件ずつ戻る。クリアで初期画面に戻る | 編集 |
| MT-13 | ドラッグ中の操作 | ドラッグしながら `Ctrl+V`・`Ctrl+C`・`B` を押しても何も起きない。`Esc` でドラッグが消える | 編集 |
| MT-14 | 性能 | 4K スクショで操作 20 件（モザイクを含む）から Undo しても引っかからない。開発ビルドの Console の計測値が 100ms 以下 | 編集 |
| MT-15 | コピー | ボタンと `Ctrl+C` / `⌘C` でコピーでき、TS-06 が出る | 出力 |
| MT-16 | 貼り付け先 | コピーした画像を Slack と Qiita のエディタに貼り付けて表示される（透過 PNG も） | 出力 |
| MT-17 | テキストのコピーを邪魔しない | フッターの文字を選択して `Ctrl+C` すると、文字がコピーされる | 出力 |
| MT-18 | ダウンロード | `redacted_image.png` で保存され、TS-08 が出る | 出力 |
| MT-19 | メタデータ | 位置情報付きの JPEG を読み込んで出力 → `exiftool` で EXIF・GPS の情報がない | 出力 |
| MT-20 | 差し替え確認 | コピー後に次の画像を貼る → 確認なしで差し替わる。未コピーの編集があると DL-01 が出る。キャンセルで元の画像が残る | 出力 |
| MT-21 | 外部通信 | 本番 URL で DevTools の Network を開いたまま、貼り付け → 黒塗り → モザイク → コピー → ダウンロード。ページ本体の読み込み以外の通信がない | 仕上げ |
| MT-22 | CSP | プレビュー URL と公開 URL（circle-note.com）の両方で、レスポンスヘッダーに CSP が付いている。Console で `fetch('https://example.com')` がブロックされる | 仕上げ |
| MT-23 | CSP 違反のエラー | 通常の操作で Console に CSP 違反のエラーが出ない（Cloudflare の差し込み機能が切れている） | 仕上げ |
| MT-24 | 確認ダイアログ | バッジから DL-02 が開き、手順どおりに確かめられる | 仕上げ |
| MT-24-2 | ダイアログ表示中の入力 | DL-01・DL-02 の表示中に `Ctrl+V`・ドロップ・`Ctrl+C`・`B` をしても何も起きず、ドロップの強調表示も出ない | 仕上げ |
| MT-25 | キーボード操作 | Tab でボタンを順に移動でき、フォーカスが見える。ダイアログ内でフォーカスが閉じ込められる | 仕上げ |
| MT-26 | スマホ | NT-02 が出る。画像の選択とダウンロードができる | 仕上げ |
| MT-27 | ストレージ | 操作後に DevTools の Application タブで、localStorage・sessionStorage・IndexedDB・Cache Storage に何もない | 仕上げ |

### 4.2 ブラウザ

| ブラウザ | 環境 | 対象 |
| :--- | :--- | :--- |
| Chrome 最新版 | Windows | 全項目 |
| Edge 最新版 | Windows | 全項目 |
| Firefox 最新版 | Windows | 全項目 |
| Safari 最新版 | macOS | 全項目（特に MT-15、MT-16） |
| スマホ（iOS Safari または Android Chrome） | 実機 | MT-26 のみ |

* フェーズごとの確認は Chrome で行い、クリップボードが関わる項目（MT-01、MT-02、MT-15〜17）だけは Safari と Firefox でも確かめる
* 結果は PR の説明に「確かめた項目の ID とブラウザ」として書く。公開前セルフチェックの結果は `docs/release-checklist-v0.1.0.md` に残す

### 4.3 作業時間の目安

| 作業 | 目安 |
| :--- | :--- |
| フェーズごとの手動確認（Chrome ＋ クリップボードの項目だけ Safari・Firefox） | 1 フェーズ 15〜30 分 |
| 公開前セルフチェック（4ブラウザ × 全項目） | 2〜3 時間（1.5 時間の作業2回に分ける） |
| 本番デプロイ後の再確認（MT-21〜23 を公開 URL で） | 15 分 |

* 公開前セルフチェックの時間は、実装フェーズの分割で最後のフェーズに組み込む

---

## 5. 完了の条件

| 対象 | 条件 |
| :--- | :--- |
| PR | CI（`ci`、`secrets`）がすべて成功し、関係する手動確認の項目を PR の説明に書いている |
| 実装フェーズ | そのフェーズの単体テストと手動確認がすべて合格し、レビューで重大な指摘が 0 件 |
| 公開（`v0.1.0`） | 4章の全項目が4ブラウザで合格（スマホは MT-26 のみ）。重大・中の不具合が 0 件 |

### 5.1 不具合の重要度

| 重要度 | 例 | 公開してよいか |
| :--- | :--- | :--- |
| 重大 | 隠した部分が出力に残る、外部通信が発生する、データが失われる | 不可 |
| 中 | 特定のブラウザでコピーできない、表示が崩れる | 原則不可（回避策を案内できるなら判断する） |
| 軽 | 文言の誤り、軽微な見た目のずれ | 可（次の版で直す） |

---

## 6. 要件 → 設計 → テストの対応表

| 要件 | 画面設計（01） | 機能設計（02） | 主なモジュール（03） | テスト |
| :--- | :--- | :--- | :--- | :--- |
| IN-1 | 3.3, 6 | F-01（3.1） | `usePasteImage`、`pickImage` | UT-BRW-01〜03、MT-01、MT-02 |
| IN-2 | 3.3 | F-02, F-03（3.2, 3.3） | `useDropImage`、`EmptyState` | UT-BRW-04、UT-HK-04〜06、MT-03、MT-04 |
| IN-3 | 5.1 | F-04（3.4） | `imageType` | UT-TYP-01〜02、MT-07 |
| IN-4 | 5.1 | F-01, F-02, F-04 | `messages` | MT-05 |
| IN-5 | 4.1 | F-04（3.4, 3.4.1） | `useImageLoader`、`selectors` | UT-SEL-02、UT-HK-02〜03、UT-HK-07、MT-20 |
| IN-6 | 3.3 | ― | `EmptyState` | MT-01 |
| IN-7 | 5.1 | F-04（3.4, 3.8） | `limits`、`prepareCanvas` | UT-LIM-01〜03、UT-CNV-04〜05、UT-HK-08、MT-06 |
| ED-1 | 3.3 | F-05（3.5） | `useRectDrag`、`SelectionOverlay` | UT-GEO-03〜04、MT-08 |
| ED-2 | 3.2 | F-06（3.6.1） | `applyOp` | UT-CNV-01、MT-08 |
| ED-3 | 3.2 | F-06（3.6.2） | `applyOp`、`mosaicBlock` | UT-MOS-01、UT-CNV-02、MT-10、MT-11 |
| ED-4 | 5.2 | F-07（3.7） | `MosaicNotice` | MT-10 |
| ED-5 | 3.3 | F-05（3.5.1, 3.5.2） | `geometry` | UT-GEO-01〜02, 05〜07, 11、MT-08 |
| ED-6 | 6 | F-05（3.5, 3.5.2） | `geometry`、`useRectDrag` | UT-GEO-08〜10、MT-09、MT-13 |
| ED-7 | 3.2, 6 | F-08（3.9） | `renderAll`、`shortcuts` | UT-RED-04〜05、UT-CNV-03、UT-KEY-03、MT-12 |
| ED-8 | 3.2 | F-09（3.10） | `Toolbar` | UT-RED-07、MT-12 |
| ED-9 | ― | F-08（3.8） | `renderAll` | UT-CNV-03、MT-14 |
| OUT-1 | 3.4 | F-10（3.11） | `copyImage` | UT-BRW-05〜07、MT-15、MT-16 |
| OUT-2 | 6 | F-10（4章） | `shortcuts` | UT-KEY-04〜05、MT-15、MT-17 |
| OUT-3 | 3.4 | F-11（3.12） | `downloadImage` | UT-BRW-08、MT-18 |
| OUT-4 | ― | F-11（3.12） | `downloadImage` | MT-19 |
| OUT-5 | 5.1 | F-10, F-12 | `useToast` | MT-15 |
| UI-1 | 7 | ― | Tailwind の設定 | 目視 |
| UI-2 | 3.1, 4.2 | F-13 | `NoNetworkBadge`、`VerifyDialog` | MT-24、MT-24-2 |
| UI-3 | 3.2 | F-07〜F-09 | `Toolbar` | MT-12 |
| UI-4 | 2, 3.3 | ― | `CanvasStage` | MT-06、MT-08 |
| UI-5 | 3.5 | ― | `Footer` | 目視 |
| UI-6 | 5.2, 8 | ― | `MobileNotice`、`platform` | MT-26 |
| 6.1 セキュリティ | 4.2 | 6 | 04 の全体 | 2.3、3章、MT-21〜23、MT-27 |
| 6.2 性能 | ― | 6 | `renderAll` | MT-14 |
| 6.3 対応ブラウザ | ― | ― | ― | 4.2 |
| 6.4 品質 | ― | ― | 05 の 5章 | 1章（CI） |

---

## 7. 未決事項

| # | 内容 | いつ |
| :--- | :--- | :--- |
| 1 | フェーズの区切り（4.1 の「フェーズ」列）は、実装フェーズの分割後に合わせて見直す | 実装フェーズの分割時 |
| 2 | MT-14 の計測方法（開発ビルドのみで Console に出す実装） | 編集を実装するフェーズ |
