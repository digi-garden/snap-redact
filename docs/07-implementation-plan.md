# 実装計画書：Snap-Redact（MVP）v1.0

最終更新：2026-11-22 ／ 対象：`docs/requirements.md` v1.2、`docs/01`〜`06`（基本設計、確定）

実装をフェーズに分け、1.5 時間の作業（セッション）ごとに「動くもの」を1つ増やす。各フェーズは「実装 → 自動テスト → レビュー」を繰り返し、重大な指摘が 0 件になったら次へ進む。

---

## 1. 進め方

### 1.1 役割

| 役割 | 担当 | 内容 |
| :--- | :--- | :--- |
| 実装 | Claude | コード・テスト・設定を書き、ブランチを切って PR を作る。CI を通す |
| 確認とマージ | 利用者 | PR を読み、プレビュー URL で手動確認（06 の MT）を行い、Squash and merge する |
| フェーズのレビュー | 外部の AI ＋ Claude | フェーズ末に、そのフェーズの差分をレビューする（1.3） |
| GitHub・Cloudflare の設定 | 利用者 | 権限が必要な設定（05 の 8章） |

* リポジトリを作成したら、このセッションにリポジトリを追加して Claude が push・PR 作成できるようにする

### 1.2 1セッション（1.5 時間）の流れ

| 時間 | 内容 | 担当 |
| :--- | :--- | :--- |
| 開始前 | そのセッションの PR を用意し、CI を通しておく | Claude |
| 0:00〜0:30 | PR の差分を読む。気になる点は PR のコメントか会話で伝える | 利用者 |
| 0:30〜1:00 | プレビュー URL で、そのセッションの手動確認を行う | 利用者 |
| 1:00〜1:30 | 指摘の修正を確認してマージ。次のセッションの内容を確かめる | 利用者・Claude |

* 1つのセッションで1つの PR を原則にする。指摘の修正が 1.5 時間に収まらない場合は、次のセッションに回す

### 1.3 完了の条件

| 単位 | 条件 |
| :--- | :--- |
| セッション（PR） | CI（`ci`・`secrets`）が成功。そのセッションの手動確認の項目（MT）が合格し、PR の説明に「確かめた項目の ID とブラウザ」を書いている |
| フェーズ | フェーズ内のすべての PR がマージ済み。外部の AI のレビューで重大な指摘が 0 件（中は直すか、理由を書いて次のフェーズに回す） |
| 公開 | 06 の 5章（4章の全項目が4ブラウザで合格、重大・中の不具合が 0 件） |

### 1.4 フェーズのレビュー

* フェーズの最後に、Claude がそのフェーズの差分の要約とレビュー用のプロンプトを用意する。利用者が外部の AI に渡し、結果を Claude が仕分けて直す
* 観点：設計（01〜06）との食い違い、黒塗りの安全性、柱A（外部通信）、ブラウザ差、テストの抜け

---

## 2. フェーズとセッションの一覧

| フェーズ | セッション | 内容 | 終わったら動くもの |
| :--- | :--- | :--- | :--- |
| P0 準備 | ― | リポジトリの作成と設定（05 の 8.1 の #1〜5。手順は 8.2〜8.6） | README だけの Public リポジトリ（ルールセット適用済み） |
| P1 土台 | S1 | 雛形：Vite・React・TypeScript・Tailwind、tsconfig 3つ、ESLint（禁止ルール・依存ルール）、Prettier、Vitest、**CI（`ci`・`secrets` のジョブ）** | PR で CI が通り、マージできる |
| | S2 | Dependabot、`deploy/_headers`・`_redirects`、`copy-deploy-files`、`check-dist`（とそのテスト）、ESLint の禁止ルールのテスト | PR で CI が通る |
| | S3 | Cloudflare Pages との連携、既存2作の配信方式との突き合わせ、ルールセットの設定 | プレビュー URL `/snap-redact/` に空のページが CSP 付きで出る |
| P2 画面 | S4 | 画面の骨組み：Header・バッジ・Toolbar・ActionBar・Footer・EmptyState・アイコン・文言・Mac 判定・MobileNotice・Dialog・VerifyDialog（DL-02） | モックどおりの画面（未読み込み）が表示され、DL-02 が開く |
| P3 入力 | S5 | `lib/core`：型、reducer、selectors、imageType、limits（とすべての単体テスト） | 単体テストが通る（画面の変化なし） |
| | S6 | 読み込み：pickImage、decodeImage、prepareCanvas、useImageLoader（世代番号）、usePasteImage、ファイル選択、CanvasStage への差し込み、Toast | 貼り付け・ファイル選択で画像が表示される |
| | S7 | ドロップ（深さの数え方）、差し替え確認（DL-01）、サイズ上限の実機確認と値の確定 | 3つの入力方法がそろい、差し替え確認が出る |
| P4 編集 | S8 | geometry（と単体テスト）、useRectDrag、SelectionOverlay、黒塗り（applyOp） | ドラッグで黒塗りできる |
| | S9 | モザイク（`clearRect` を含む）、モード切り替え、NT-01、shortcuts（`B`・`M`・`Esc`・`Ctrl+Z`）と単体テスト | 2つのモードで隠せる。キーで切り替えられる |
| | S10 | Undo（renderAll）、クリア、性能の計測（開発ビルドのみ） | 取り消し・クリアができる。4K で計測値を確かめる |
| P5 出力 | S11 | copyImage、downloadImage、`Ctrl+C`、EXPORTED、トースト、Safari・Firefox での確認 | コピーとダウンロードができ、Slack・Qiita に貼れる |
| P6 仕上げ | S12 | brand-assets（ロゴ・favicon・フッター）、ErrorBoundary、キーボード操作とフォーカス、README（確かめ方の手順） | 公開できる見た目と README がそろう |
| | S13 | 公開前セルフチェック（前半：Windows の Chrome・Edge・Firefox） | `docs/release-checklist-v0.1.0.md` の前半 |
| | S14 | 公開前セルフチェック（後半：Mac の Safari、スマホ）、指摘の修正、本番デプロイ、公開 URL での再確認、タグ `v0.1.0` | **公開** |
| P7 記事 | S15 | Qiita・Zenn の記事（下書きは Claude、利用者が仕上げて投稿） | 記事の公開 |

* 合計 15 セッション（約 22.5 時間）。要件定義・基本設計にかかった時間と合わせると、予算（20〜30 時間）の上限付近になる。超えそうな場合の削り方は 5章

---

## 3. セッションの詳細

### P1 土台

#### S1 雛形

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `.github/workflows/ci.yml`（`ci`・`secrets`。ルールセットの必須チェックのため S1 に含める）、`package.json`（スクリプトは 05 の 2章）、`vite.config.ts`（05 の 3章）、`tsconfig.app/core/node.json`、`eslint.config.js`（04 の 3章、03 の 4章）、`.prettierrc`、`.nvmrc`、`.gitattributes`、`.gitignore`、`.vscode/extensions.json`、`src/main.tsx`・`App.tsx`（仮の表示）、`docs/`（01〜07 を置く） |
| 自動テスト | `npm run verify`（この時点ではテストは0件でもよい）。PR で CI の `ci`・`secrets` が成功する |
| マージ後 | CodeQL の最初のスキャンが成功したことを確かめる（利用者、05 の 8.5） |
| 手動確認 | `npm run dev` で仮の表示が出る |
| 先に確かめること | 既存2作の ESLint・Prettier・ディレクトリ構成（03 の 9章 #1、05 の 9章 #2） |

#### S2 CI と成果物検査

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `ci.yml` への `check:dist` の追加、`.github/dependabot.yml`、`deploy/_headers`・`_redirects`、`scripts/copy-deploy-files.mjs`・`check-dist.mjs`、`src/test/eslint-forbidden/` |
| 自動テスト | `check-dist` のテスト（06 の 3章）、ESLint の禁止ルールのテスト（06 の 2.3） |
| 手動確認 | PR で CI が成功する。`npm run preview` で `/snap-redact/` を開き、レスポンスヘッダーに CSP が付いている |

#### S3 配信

| 項目 | 内容 |
| :--- | :--- |
| 作業 | 既存2作の配信方式の確認（05 の 6.1）→ 必要なら 04・05 を更新、Cloudflare Pages の連携（利用者）、Cloudflare のスクリプト差し込み機能の確認（04 の 5章） |
| 手動確認 | プレビュー URL の `/snap-redact/` で CSP が付いている。Console で `fetch` がブロックされる（MT-22 の先取り） |
| フェーズ末 | P1 のレビュー（ESLint・CSP・CI の設定を重点に） |

### P2 画面

#### S4 画面の骨組み

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | 03 の 3章の components のうち、状態を持たない表示部品すべてと `messages.ts`・`platform.ts`・`icons.tsx`、`Dialog`・`VerifyDialog` |
| 自動テスト | `platform.ts` の判定（Mac・スマホ） |
| 手動確認 | モック（Design キャンバス）と見比べる。DL-02 の開閉、Tab の移動、スマホ幅で NT-02 |
| フェーズ末 | P2 のレビュー（画面設計との食い違い、アクセシビリティ） |

### P3 入力

#### S5 lib/core

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `types.ts`、`editorReducer.ts`、`selectors.ts`、`imageType.ts`、`limits.ts`、`mosaicBlock.ts` |
| 自動テスト | UT-RED-01〜10、UT-SEL-01〜03、UT-TYP-01〜02、UT-LIM-01〜03、UT-MOS-01 |
| 手動確認 | なし（`tsconfig.core.json` で DOM の型が使えないことを確かめる） |

#### S6 読み込み

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `pickImage.ts`、`decodeImage.ts`、`prepareCanvas.ts`、`useImageLoader`、`usePasteImage`、`CanvasStage`（Canvas の差し込み、市松模様）、`useToast`・`Toast` |
| 自動テスト | UT-BRW-01〜03、UT-CNV-04〜05、UT-HK-01、UT-HK-08 |
| 手動確認 | MT-01、MT-02、MT-04、MT-05（テキストのみ）、MT-07 |

#### S7 ドロップと差し替え確認

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `useDropImage`、ドロップの強調表示、`ConfirmReplaceDialog`（DL-01）、サイズ上限の値の確定（`limits.ts`） |
| 自動テスト | UT-BRW-04、UT-HK-02〜07 |
| 手動確認 | MT-03、MT-05（BMP）、MT-06（4ブラウザで上限の実機確認、02 の 8章 #2） |
| フェーズ末 | P3 のレビュー（読み込みの競合、メモリ解放、上限値） |

### P4 編集

#### S8 矩形と黒塗り

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `geometry.ts`、`useRectDrag`、`SelectionOverlay`、`applyOp.ts`（黒塗り）、ADD_OP の配線 |
| 自動テスト | UT-GEO-01〜11、UT-CNV-01 |
| 手動確認 | MT-08（縮小表示での端の確認）、MT-09 |

#### S9 モザイクとキー操作

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `applyOp.ts`（モザイク）、モード切り替え、`MosaicNotice`、`shortcuts.ts`・`useShortcuts`（`B`・`M`・`Esc`・`Ctrl+Z` の判定まで） |
| 自動テスト | UT-CNV-02、UT-KEY-01〜03、06〜07 |
| 手動確認 | MT-10、MT-11（透過 PNG）、MT-13 |

#### S10 Undo・クリア・性能

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `renderAll.ts`、Undo とクリアの配線、開発ビルドのみの計測 |
| 自動テスト | UT-CNV-03 |
| 手動確認 | MT-12、MT-14（4K・操作 20 件、02 の 8章 #3） |
| フェーズ末 | P4 のレビュー（黒塗りの安全性を最重点に） |

### P5 出力

#### S11 コピーとダウンロード

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | `copyImage.ts`、`downloadImage.ts`、`Ctrl+C` の判定、EXPORTED の配線、TS-06〜08 |
| 自動テスト | UT-BRW-05〜08、UT-KEY-04〜05 |
| 手動確認 | MT-15〜20（MT-15・16 は4ブラウザ。02 の 8章 #1、#4） |
| フェーズ末 | P5 のレビュー（Safari のコピー、ユーザー操作の判定） |

### P6 仕上げ・公開

#### S12 仕上げ

| 項目 | 内容 |
| :--- | :--- |
| 作るもの | brand-assets の取り込み（ロゴ・favicon・フッター）、`ErrorBoundary`、フォーカスの見た目、README（概要・使い方・確かめ方の手順・CSP の説明・ライセンス） |
| 手動確認 | MT-24、MT-24-2、MT-25、MT-26 |

#### S13・S14 公開前セルフチェックと公開

| 項目 | 内容 |
| :--- | :--- |
| 作業 | 06 の 4章の全項目を4ブラウザで確認し、`docs/release-checklist-v0.1.0.md` に記録する。不具合を直し、本番デプロイ、公開 URL で MT-21〜23 を再確認し、タグ `v0.1.0` と GitHub Release を作る（05 の 7.3） |
| フェーズ末 | 公開前の最終レビュー（外部の AI に、チェックリストの結果と README を渡す） |

### P7 記事

#### S15 記事

| 項目 | 内容 |
| :--- | :--- |
| 作業 | 要件定義 9章の方針で、Claude が下書き（Qiita 版・Zenn 版）を作る。利用者がスクショを撮り、仕上げて投稿する |
| 内容の柱 | 黒塗りの端から画素が漏れる理由と整数化、透過画像のモザイクと `clearRect`、モザイクが復元されうる理由、送信を4段で止める仕組み（04 の 8章）、`Ctrl+C` で完結させる実装と Safari の癖 |

---

## 4. 未決事項を解消するセッション

| 未決事項 | 資料 | 解消するセッション |
| :--- | :--- | :--- |
| 既存2作の構成・ESLint・Prettier との差分 | 03 の 9章、05 の 9章 | S1 |
| Context-Packer の `_headers` との差分 | 04 の 10章 | S2 |
| 既存2作の配信方式、Cloudflare のドメイン設定 | 04 の 10章、05 の 6.1 | S3 |
| サイズ上限の値 | 02 の 8章 #2 | S7 |
| 透過画像のモザイク、補間品質のブラウザ差 | 02 の 8章 #5〜6 | S9 |
| Undo の性能 | 02 の 8章 #3 | S10 |
| Promise を渡すコピーのブラウザ差、透過 PNG の貼り付け先 | 02 の 8章 #1、#4 | S11 |
| Cloudflare のパス別の集計 | 要件 3章 | S14 |

---

## 5. 予算を超えそうなときの削り方

上から順に削る。どれも公開後の版（`v0.2.0` 以降）で戻せる。

| 順 | 削るもの | 節約 | 影響 |
| :--- | :--- | :--- | :--- |
| 1 | ESLint の禁止ルールのテスト（06 の 2.3）を、手で1回確かめるだけにする | 0.5〜1 時間 | ルールを誤って消したときに気づきにくくなる |
| 2 | `B` / `M` のキー操作 | 0.3 時間 | ボタンで切り替える |
| 3 | 画像の大きさ・操作件数の表示（01 の 3.4） | 0.3 時間 | なし（補助的な表示） |
| 4 | スマホの表示の作り込み（NT-02 以外） | 0.5 時間 | 要件の範囲内（スマホは動作保証外） |
| 5 | フェーズのレビューを P1・P4・P6 だけにする | 1〜2 時間 | 画面・入力・出力のレビューは公開前の最終レビューにまとめる |

* 削らないもの：黒塗りの安全性（ED-5、モザイクの `clearRect`）、外部通信の禁止（CSP・check-dist）、コピー（柱B）、公開前セルフチェックの外部通信と CSP の項目
