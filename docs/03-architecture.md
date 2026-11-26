# アーキテクチャ設計書：Snap-Redact（MVP）v1.2

最終更新：2026-11-26 ／ 対象要件：`docs/requirements.md` v1.2 ／ 関連：`docs/01-screen-design.md` v1.1、`docs/02-functional-design.md` v1.1

* v1.0（2026-11-22）：初版
* v1.1（2026-11-22）：外部レビュー2回目を反映（作業用 Canvas を引数で渡す方式に統一、市松模様を CSS のグラデーションで描く、`_headers` の置き場所）
* v1.2（2026-11-26）：S8 の実装に合わせ、CanvasStage の要素の構成を変更（選択枠は Canvas を差し込む要素の外に置く。5.2）

基本設計の資料 3/6。ソースコードを「どう分け、どこに何を書き、何に依存してよいか」を定める。機能の振る舞いは 02、外部通信の禁止など安全面の仕組みは 04 で扱う。

---

## 1. 方針

1. **UI と処理を分ける**：React コンポーネントは表示とイベントの受け渡しだけを行う。状態遷移・座標計算・描画・入出力の処理は `src/lib/` に置き、React に依存させない
2. **純粋な処理を最大にする**：DOM に触れない計算（座標、矩形、状態遷移、上限判定）は純粋関数にし、単体テストの中心にする
3. **ブラウザ API の利用箇所を絞る**：Canvas・Clipboard・DataTransfer・ダウンロードを扱うコードを決まったファイルに集め、レビューと記事で「画像に触るコードはここだけ」と示せるようにする（柱A）
4. **依存ライブラリを最小にする**：実行時の依存は `react` と `react-dom` だけにする（6章）

---

## 2. 技術スタック

| 区分 | 採用 | 備考 |
| :--- | :--- | :--- |
| 言語 | TypeScript（`strict`） | 6章のコンパイラ設定 |
| UI | React（関数コンポーネント＋フック） | 状態管理ライブラリは使わない（`useReducer` で足りる規模） |
| ビルド | Vite | `base: '/snap-redact/'`（05 で詳細） |
| スタイル | Tailwind CSS | ビルド時に CSS ファイルを生成する。実行時にスタイルを注入しない |
| 単体テスト | Vitest（環境は jsdom） | 06 テスト設計書で詳細化 |
| lint・整形 | ESLint（flat config）、Prettier | 外部通信の禁止ルールは 04 |
| 配信 | Cloudflare Pages | 05 で詳細 |

* 各ツールのバージョンは、実装開始時点の安定版に固定し、`package-lock.json` をコミットする
* 既存2作（Mask & Unmask、Context-Packer）と同じ構成にそろえる。差分が出た場合は理由を README に残す

---

## 3. ディレクトリ構成

```text
snap-redact/
├─ docs/                       // 要件定義・基本設計（本書を含む）
├─ deploy/                     // Pages のルート（dist/ 直下）に置くファイル（05 の 3章）
│  ├─ _headers                 // CSP などのレスポンスヘッダー（04）
│  └─ _redirects               // / → /snap-redact/
├─ public/
│  └─ favicon.svg              // brand-assets から取り込み
├─ scripts/
│  ├─ copy-deploy-files.mjs    // deploy/ の中身を dist/ 直下へコピー
│  └─ check-dist.mjs           // ビルド成果物の検査（04・05）
├─ src/
│  ├─ main.tsx                 // エントリ。App を描画するだけ
│  ├─ App.tsx                  // 状態（reducer）の保持と、各フック・コンポーネントの配線
│  ├─ index.css                // Tailwind の読み込み
│  ├─ components/              // 表示（React）
│  │  ├─ Header.tsx
│  │  ├─ NoNetworkBadge.tsx
│  │  ├─ Toolbar.tsx
│  │  ├─ MosaicNotice.tsx      // NT-01
│  │  ├─ CanvasStage.tsx       // Canvas の差し込み、選択枠、空状態、ドロップ強調
│  │  ├─ EmptyState.tsx
│  │  ├─ SelectionOverlay.tsx  // 選択枠（Canvas には描かない）
│  │  ├─ ActionBar.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Toast.tsx
│  │  ├─ Dialog.tsx            // ダイアログの共通部品（フォーカス管理）
│  │  ├─ ConfirmReplaceDialog.tsx  // DL-01
│  │  ├─ VerifyDialog.tsx      // DL-02
│  │  ├─ MobileNotice.tsx      // NT-02
│  │  ├─ ErrorBoundary.tsx
│  │  └─ icons.tsx             // 線画 SVG アイコン（アイコン用ライブラリは使わない）
│  ├─ hooks/                   // React と lib の橋渡し
│  │  ├─ useImageLoader.ts     // F-04：世代番号、差し替え待ち
│  │  ├─ usePasteImage.ts      // F-01
│  │  ├─ useDropImage.ts       // F-02：深さの数え方
│  │  ├─ useRectDrag.ts        // F-05：Pointer Events
│  │  ├─ useShortcuts.ts       // 4章のキー操作
│  │  └─ useToast.ts           // F-12
│  ├─ lib/
│  │  ├─ core/                 // 純粋な処理（DOM に触れない）
│  │  │  ├─ types.ts           // Mode, Rect, Op, Point, EditorState<TImage>, EditorAction<TImage>
│  │  │  ├─ editorReducer.ts   // 02 の 2.2
│  │  │  ├─ selectors.ts       // 02 の 2.4（canUndo など）
│  │  │  ├─ geometry.ts        // toImagePoint, toRect
│  │  │  ├─ mosaicBlock.ts     // mosaicBlockSize
│  │  │  ├─ limits.ts          // MAX_EDGE, MAX_PIXELS, exceedsLimit
│  │  │  ├─ imageType.ts       // 対応形式の判定
│  │  │  └─ shortcuts.ts       // keydown → 動作の判定（純粋関数）
│  │  ├─ canvas/               // Canvas に描く処理（画像の画素に触る唯一の場所）
│  │  │  ├─ prepareCanvas.ts   // 02 の 3.4 手順4
│  │  │  ├─ applyOp.ts         // 黒塗り・モザイク
│  │  │  └─ renderAll.ts       // Undo 時の描き直し
│  │  └─ browser/              // そのほかのブラウザ API
│  │     ├─ pickImage.ts       // DataTransfer / clipboardData から画像を1件取り出す
│  │     ├─ decodeImage.ts     // createImageBitmap
│  │     ├─ copyImage.ts       // Clipboard API への書き込み
│  │     ├─ downloadImage.ts   // <a download> による保存
│  │     └─ platform.ts        // Mac 判定（キー表記用）、スマホ判定
│  └─ messages.ts              // 画面の文言（TS-xx, NT-xx, DL-xx）を一か所にまとめる
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js
├─ .github/                    // CI、Dependabot（05）
└─ README.md
```

---

## 4. レイヤーと依存のルール

```text
components ──▶ hooks ──▶ lib/browser ──▶ lib/core
     │            │            ▲               ▲
     │            └──▶ lib/canvas ─────────────┘
     └──────────────────────────────▶ lib/core（型・selectors のみ）
```

| レイヤー | 依存してよいもの | 依存してはいけないもの |
| :--- | :--- | :--- |
| `lib/core` | なし（TypeScript の標準機能だけ） | React、DOM の型・API、`lib/canvas`、`lib/browser` |
| `lib/canvas` | `lib/core`、Canvas の API | React |
| `lib/browser` | `lib/core`、ブラウザ API | React、`lib/canvas` |
| `hooks` | `lib/*`、React | `components` |
| `components` | `hooks`、`lib/core`（型と selectors）、`messages.ts` | `lib/canvas`、`lib/browser` を直接呼ぶこと |

* このルールは ESLint の `no-restricted-imports` で強制する。違反は CI で失敗する。import の文字列はファイルの解決後のパスではないため、`../canvas/x` のような相対パスや `react/jsx-runtime` のようなサブパスも捕まえられるよう、パスの区切り単位の正規表現で判定する（P1 レビューで修正）。ルールそのものの正しさは `scripts/eslint-rules.test.mjs` で確かめる
* `lib/core` は tsconfig を分けて `lib: ["ES2022"]`（DOM なし）にし、DOM の型を使うとコンパイルエラーになるようにする
* 画像の画素に触れてよいのは `lib/canvas` だけ。`lib/browser` は Blob と ImageBitmap を受け渡すだけで、画素を読まない

---

## 5. 主なモジュールの責務

### 5.1 App と状態

| モジュール | 責務 | 機能 |
| :--- | :--- | :--- |
| `App.tsx` | `useReducer(editorReducer)` を保持し、表示用 Canvas の参照（`canvasRef`）、ダイアログ、差し替え待ちを管理する。各フックに状態と dispatch を渡す | 全体 |
| `editorReducer.ts` | 02 の 2.2 の遷移だけを行う純粋関数。副作用なし | F-04〜F-11 |
| `selectors.ts` | `canUndo`、`canExport`、`needsReplaceConfirm`、`acceptsInput` を計算する純粋関数 | 02 の 2.4 |

* 規模が小さいので、Context は使わず props で渡す。props の受け渡しが3段を超えたら Context を検討する

### 5.2 Canvas の扱い（CanvasStage）

```text
CanvasStage（div：外枠・枠線・背景の市松模様はここに付ける。市松模様は CSS の `conic-gradient` で描き、`data:` URI の画像は使わない（04 の 2.2））
 ├─ div（position: relative。選択枠の位置の基準）
 │   ├─ div ref=containerRef（Canvas を差し込む場所。中身は差し込むたびに置き換わるので、ほかの要素は入れない）
 │   │   └─ canvas（prepareCanvas が作った要素を差し込む。border・padding なし）
 │   └─ SelectionOverlay（position: absolute; pointer-events: none）
 ├─ EmptyState（未読み込み時）
 └─ ドロップ強調の重ね表示
```

* 表示用 Canvas は React に描画させず、`prepareCanvas` が作った要素を `useLayoutEffect` で差し込む（02 の 3.4 手順6）。差し替えのときは古い要素を外して 0×0 に戻す
* 表示サイズは CSS（`max-width: 100%; max-height: 100%; width: auto; height: auto`）で縦横比を保って縮小する。原寸より大きくはしない
* `SelectionOverlay` の位置は、原寸の矩形を `canvas.getBoundingClientRect()` を使って表示座標に戻して決める
* `canvasRef` は App が持ち、コピー・ダウンロード・描画のフックに渡す

### 5.3 lib/canvas

| 関数 | 入力 | 出力 | 副作用 |
| :--- | :--- | :--- | :--- |
| `prepareCanvas(base)` | ImageBitmap | `HTMLCanvasElement \| null` | 新しい Canvas を作って描く |
| `applyOp(ctx, op, work)` | 描画先、操作、作業用 Canvas | なし | 描画先の画素を書き換える |
| `renderAll(ctx, base, ops, work)` | 描画先、元画像、操作の一覧、作業用 Canvas | なし | 描画先を描き直す |

* 作業用 Canvas（モザイク用）は引数 `work` で受け取る（02 の 3.8 と同じ）。`lib/canvas` はモジュール内に Canvas を持たない。実際の1枚は `App` が `useRef` で作って保持し、`applyOp`・`renderAll` を呼ぶときに渡す。テストでは偽物の Canvas を渡せる

### 5.4 lib/browser

| 関数 | 入力 | 出力 |
| :--- | :--- | :--- |
| `pickImageFromClipboard(data)` | `DataTransfer` | `File \| null` |
| `pickImageFromDrop(data)` | `DataTransfer` | `File \| null` |
| `decodeImage(file)` | `File` | `Promise<ImageBitmap>` |
| `copyImage(canvas)` | `HTMLCanvasElement` | `Promise<'ok' \| 'unsupported' \| 'failed'>` |
| `downloadImage(canvas, fileName)` | `HTMLCanvasElement`、ファイル名 | `Promise<'ok' \| 'failed'>` |
| `isMac()` / `isMobileLike()` | なし | `boolean` |

### 5.5 hooks

| フック | 受け取るもの | 責務 |
| :--- | :--- | :--- |
| `useImageLoader` | dispatch、状態、表示 Canvas の差し込み関数、通知関数 | 02 の 3.4（世代番号・事前描画・差し替え待ち）。`load(file)` を返す |
| `usePasteImage` | `acceptsInput`、`load` | `document` の `paste` を購読する |
| `useDropImage` | `acceptsInput`、`load` | `window` のドラッグ系イベントを購読し、強調表示の有無を返す |
| `useRectDrag` | 状態、Canvas 要素、確定時の関数 | Pointer Events を扱い、ドラッグ中の矩形と `isDragging` を返す |
| `useShortcuts` | 状態から求めた条件、各動作の関数 | `window` の `keydown` を購読し、判定は `lib/core/shortcuts.ts` に任せる |
| `useToast` | なし | 表示中のトーストと `showToast` を返す |

* イベントの購読はすべてフックの中で行い、アンマウント時に解除する

---

## 6. コード規約

### 6.1 TypeScript

* `strict: true`、`noUncheckedIndexedAccess: true`、`noImplicitOverride: true`、`exactOptionalPropertyTypes: true`
* `any` は禁止（ESLint でエラー）。どうしても必要な場合は `unknown` を使い、型を絞り込む
* 型は `type` で書く（`interface` は使わない。揃えるため）
* 例外を投げる関数は作らず、失敗は戻り値（`null` や結果の文字列）で返す。外部 API の例外は `lib/browser` と `lib/canvas` の中で受け止める

### 6.2 命名・ファイル

| 対象 | 規則 | 例 |
| :--- | :--- | :--- |
| コンポーネント | PascalCase、1ファイル1コンポーネント | `CanvasStage.tsx` |
| フック | `use` で始まる camelCase | `useRectDrag.ts` |
| 関数・変数 | camelCase | `toImagePoint` |
| 定数 | UPPER_SNAKE_CASE | `MAX_EDGE` |
| テスト | 対象と同じ場所に `*.test.ts` | `geometry.test.ts` |

* `export default` は使わない（名前付き export に統一）
* コメントは日本語でよい。「なぜそうしたか」（例：`clearRect` が必要な理由）を書く。要件・設計の ID（`ED-5` など）を添える

### 6.3 文言

* 画面に出す文言は `messages.ts` にまとめ、コンポーネントに直接書かない（画面設計 5章の ID と対応させる）
* キー表記（`Ctrl` / `⌘`）は `platform.ts` の判定で切り替える

### 6.4 依存ライブラリ

* 実行時の依存は `react` と `react-dom` だけ。新しく追加する場合は、PR に理由を書く
* アイコン・UI 部品・ユーティリティのライブラリは使わない（自前の `icons.tsx` と Tailwind で足りる）
* 理由：依存が増えるほど、外部通信を含むコードが紛れ込む余地と、更新の手間が増えるため（04 の供給網の対策）

---

## 7. 処理の流れ（代表例）

### 7.1 貼り付け → 表示

```text
document paste ─▶ usePasteImage ─▶ pickImageFromClipboard ─▶ useImageLoader.load
  ─▶ imageType 判定 ─▶ decodeImage ─▶ 世代番号の確認 ─▶ limits 判定 ─▶ prepareCanvas
  ─▶ （必要なら DL-01）─▶ dispatch(LOAD) ─▶ CanvasStage が Canvas を差し込む
```

### 7.2 ドラッグ → 黒塗り

```text
pointerdown/move/up ─▶ useRectDrag ─▶ toImagePoint / toRect（lib/core）
  ─▶ 確定 ─▶ dispatch(ADD_OP) ─▶ applyOp（lib/canvas）で追加分だけ描く
```

### 7.3 Ctrl+C → コピー

```text
keydown ─▶ useShortcuts ─▶ shortcuts.ts が「copy」と判定 ─▶ preventDefault
  ─▶ copyImage(canvas)（await を挟まずに呼ぶ）─▶ 結果に応じて dispatch(EXPORTED) とトースト
```

---

## 8. 要件・機能との対応

| 機能（02） | 主なモジュール |
| :--- | :--- |
| F-01 | `usePasteImage`、`pickImage.ts` |
| F-02 | `useDropImage`、`pickImage.ts` |
| F-03 | `EmptyState.tsx`、`useImageLoader` |
| F-04 | `useImageLoader`、`imageType.ts`、`decodeImage.ts`、`limits.ts`、`prepareCanvas.ts`、`ConfirmReplaceDialog.tsx` |
| F-05 | `useRectDrag`、`geometry.ts`、`SelectionOverlay.tsx` |
| F-06 | `applyOp.ts`、`mosaicBlock.ts` |
| F-07 | `Toolbar.tsx`、`useShortcuts` |
| F-08 | `renderAll.ts`、`useShortcuts` |
| F-09 | `Toolbar.tsx`、`App.tsx` |
| F-10 | `copyImage.ts`、`ActionBar.tsx`、`useShortcuts` |
| F-11 | `downloadImage.ts`、`ActionBar.tsx` |
| F-12 | `useToast`、`Toast.tsx`、`messages.ts` |
| F-13 | `Dialog.tsx`、`ConfirmReplaceDialog.tsx`、`VerifyDialog.tsx` |

---

## 9. 未決事項

| # | 内容 | いつ |
| :--- | :--- | :--- |
| 1 | 既存2作のディレクトリ構成・ESLint 設定との差分 | 初回の実装フェーズで既存リポジトリを確認 |
