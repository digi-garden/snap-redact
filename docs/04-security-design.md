# セキュリティ設計書：Snap-Redact（MVP）v1.1

最終更新：2026-11-22 ／ 対象要件：`docs/requirements.md` v1.2（特に 2章 柱A、6.1） ／ 関連：`docs/03-architecture.md` v1.1、`docs/05-devenv-cicd.md` v1.1

* v1.0（2026-11-22）：初版
* v1.1（2026-11-22）：外部レビュー2回目と再確認を反映（成果物検査の対象パスを含む。ESLint の禁止を参照そのものの禁止に変更、`upgrade-insecure-requests` の削除、`_headers` の配置、ESLint の限界の明記）

基本設計の資料 4/6。画像を外に出さないこと（柱A）を、どの仕組みで、何段で守るかを定める。黒塗りの画素の安全性（端の整数化・モザイクの `clearRect`）は 02 機能設計書で扱っている。

---

## 1. 守るものと脅威

### 1.1 守るもの

| 資産 | 内容 |
| :--- | :--- |
| 画像データ | ユーザーが貼り付けた元画像と、編集途中の画像。社内画面・本番環境・個人情報を含みうる |
| 隠した部分の中身 | 黒塗り・モザイクの下にあった画素 |
| 信頼 | 「送信しない」という説明が事実であること（柱A） |

### 1.2 脅威と対策の対応

| # | 脅威 | 主な対策 | 本書 |
| :--- | :--- | :--- | :--- |
| T1 | 自分のコードが画像を外部に送る（不具合・将来の変更） | CSP、ESLint、ビルド成果物の検査 | 2, 3, 4 |
| T2 | 依存ライブラリに外部送信が紛れ込む | 依存の最小化、CSP、ロックファイル、Dependabot | 2, 6 |
| T3 | Cloudflare がページにスクリプトを差し込む | Cloudflare の設定、CSP | 2, 5 |
| T4 | 画像がブラウザのストレージに残る | ESLint で禁止、保存しない設計 | 3 |
| T5 | 他サイトにページを埋め込まれて操作される（クリックジャッキング） | `frame-ancestors 'none'` | 2 |
| T6 | 隠したはずの画素が出力に残る | 02 の 3.5.2（外側への整数化）、3.6.2（`clearRect`）、OUT-4（PNG で書き出し） | 02 |
| T7 | リポジトリに秘密情報が入る（Public のため） | push protection、gitleaks | 7 |
| T8 | ページ遷移を使って画像の情報を送る（CSP の `connect-src` では止められない） | ESLint で遷移を禁止、遷移先 URL に動的な値を入れない | 3.1, 3.3 |

### 1.3 対象外（防げないもの）

* **ブラウザ拡張機能**：ユーザーが入れた拡張機能は、ページの内容を読める。CSP では防げない。確認ダイアログ（DL-02）と記事で「拡張機能は別」と正直に書く
* **端末そのものの侵害**：OS やブラウザがマルウェアに侵されている場合
* **ユーザーの隠し漏れ**：隠す範囲の判断はユーザーが行う（フッターの免責文、UI-5）

---

## 2. CSP とレスポンスヘッダー（実行時に止める）

### 2.1 `deploy/_headers`（ビルド後に `dist/_headers` へコピー）

```text
/snap-redact/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; media-src 'none'; worker-src 'none'; frame-src 'none'; child-src 'none'; object-src 'none'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
```

* このファイルはリポジトリでは `deploy/_headers` に置き、ビルド後に `dist/` の直下（`dist/_headers`）へコピーする（`public/` に置くと `dist/snap-redact/` にコピーされて効かないため）。アプリ本体は `dist/snap-redact/` に出力するので、パス `/snap-redact/*` は本番でもプレビュー URL でも同じになる（05 の 3章・6.1）
* 手元の `vite preview` にも同じ CSP を付ける（05 の 2.1）。`upgrade-insecure-requests` を入れていないので、LAN 内のスマホから PC の IP アドレスで確かめる場合も読み込みは失敗しない

### 2.2 各ディレクティブの理由

| ディレクティブ | 値 | 理由 |
| :--- | :--- | :--- |
| `default-src` | `'none'` | 明示していない種類はすべて禁止から始める |
| `script-src` | `'self'` | 自分のドメインのスクリプトだけ。インラインスクリプトと `eval` は禁止 |
| `style-src` | `'self'` | Vite が出力する CSS ファイルだけ。React の `style` 指定は CSSOM 経由なので影響を受けない |
| `img-src` | `'self'` | ロゴ・favicon だけ。ユーザーの画像は `<img>` を使わず Canvas で扱うため、`blob:` と `data:` は不要（要件 6.1 の例から絞った。05 の `assetsInlineLimit: 0` と組み合わせる）。CSS の `background-image` に `data:` を書くと止められるので、透過背景の市松模様は CSS のグラデーションで描く（03 の 5.2） |
| `connect-src` | `'none'` | **柱Aの中心**。`fetch`・`XMLHttpRequest`・`WebSocket`・`EventSource`・`sendBeacon` をすべて止める |
| `worker-src`・`frame-src`・`child-src`・`object-src`・`media-src` | `'none'` | 使わない機能を閉じる |
| `base-uri` | `'none'` | `<base>` による相対パスの乗っ取りを防ぐ |
| `form-action` | `'none'` | フォーム送信による外部送信を防ぐ（フォームは使わない） |
| `frame-ancestors` | `'none'` | 他サイトへの埋め込みを禁止（T5）。古いブラウザ向けに `X-Frame-Options: DENY` も付ける |

### 2.3 その他のヘッダー

| ヘッダー | 理由 |
| :--- | :--- |
| `Referrer-Policy: no-referrer` | フッターのリンクで外部へ移動するとき、URL を送らない |
| `X-Content-Type-Options: nosniff` | ファイルの種類の推測による誤解釈を防ぐ |
| `Permissions-Policy` | 使わない機能を閉じる。`clipboard-read=()` で読み取り API も閉じる（貼り付けは `paste` イベントで行うので影響しない。書き込みは閉じない） |
| `Cross-Origin-Opener-Policy`・`Cross-Origin-Resource-Policy` | 他サイトのウィンドウ・ページからの参照を切る |

* `upgrade-insecure-requests` は入れない。`http://` の参照は `check-dist.mjs`（4章）が CI で検出して失敗させるため、効く場面がほとんどない。入れないことで、本番と手元（`vite preview`）の CSP を同じにできる

### 2.4 CSP で止められないもの

* **ページ遷移**：`location.href = 'https://...?data=...'` や `window.open(...)`、`<a href>` のクリックは、`connect-src` の対象外。→ 3.1・3.3 の ESLint で禁止し、リンク先は固定の URL だけにする
* **ブラウザ拡張機能**：1.3 のとおり

---

## 3. ESLint による禁止（書いた時点で止める）

### 3.1 外部通信・保存・遷移につながる API の参照を禁止する

書き方の抜け（`window.location.href = …`、`document.location.href = …`、`location = …` など）をセレクタで一つずつ塞ぐのではなく、**API の参照そのものを禁止する**。このツールは `location` も `open` も読む必要がないので、参照を禁止しても困らない。

```js
// eslint.config.js（抜粋）
const NET = '外部通信は禁止（柱A）';
const STORE = '画像を保存しない（T4）';
const NAV = 'ページ遷移による送信を防ぐ（T8）';

const bannedGlobals = [
  ['fetch', NET], ['XMLHttpRequest', NET], ['WebSocket', NET], ['EventSource', NET],
  ['localStorage', STORE], ['sessionStorage', STORE], ['indexedDB', STORE], ['caches', STORE],
  ['location', NAV], ['open', NAV],
];
// 同じ名前を window. / self. / globalThis. / document. 経由で参照することも禁止する
const globalObjects = ['window', 'self', 'globalThis', 'document'];

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error',
        ...bannedGlobals.map(([name, message]) => ({ name, message })),
      ],
      'no-restricted-properties': ['error',
        ...globalObjects.flatMap((object) =>
          bannedGlobals.map(([property, message]) => ({ object, property, message }))),
        { object: 'navigator', property: 'sendBeacon', message: NET },
        { object: 'navigator', property: 'serviceWorker', message: 'Service Worker は使わない' },
      ],
      'no-restricted-syntax': ['error', ...restrictedSyntax], // 3.2・3.3 をまとめた1つの配列
    },
  },
];
```

* `no-restricted-syntax` は1つのルールなので、3.2 と 3.3 の項目を1つの配列（`restrictedSyntax`）にまとめて設定する（別々に書くと後のものが前のものを上書きする）

### 3.2 動的なコード実行の禁止

* `no-eval`、`no-implied-eval`、`no-new-func` をエラーにする
* `dangerouslySetInnerHTML` を `no-restricted-syntax`（`JSXAttribute[name.name='dangerouslySetInnerHTML']`）でエラーにする（ESLint のプラグインを増やさないため）

### 3.3 動的な値を使ったアクセス・リンクの禁止（T8）

```js
const restrictedSyntax = [
  // 3.2
  { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'HTML の直接挿入は禁止' },
  // 3.3：window['fetch'] や window['location'] のような文字列による参照
  { selector: "MemberExpression[computed=true][property.type='Literal'][property.value=/^(fetch|open|location|sendBeacon|localStorage|sessionStorage|indexedDB|caches)$/]", message: '文字列による参照で禁止ルールを回避しない' },
  // 3.3：リンク先は固定の文字列だけ
  { selector: "JSXAttribute[name.name='href'] > JSXExpressionContainer", message: 'リンク先は固定の文字列だけ（T8）' },
];
```

* フッターのリンクなど `<a href>` は、文字列リテラルだけを許す（式を入れると ESLint エラー）
* `<a download>` によるダウンロード（`downloadImage.ts`）は、DOM API（`document.createElement('a')` と `a.href = blobUrl`）で作るため JSX のルールの対象外。`a.href` への代入は `location` の参照ではないので 3.1 にも当たらない

### 3.3.1 ESLint の限界

* ESLint はソースの書き方を見るだけなので、別名を使う書き方（`const w = window; w.fetch(...)`）や、実行時に組み立てた名前によるアクセスは検出できない
* ESLint は「うっかり書いてしまうこと」を止める柵であり、送信を確実に止める壁は CSP（2章）である。記事でもこの位置づけで説明する

### 3.4 適用範囲

* `src/` 全体に適用する。`scripts/` と設定ファイルは対象外（ビルド時に Node で動くもので、ブラウザには届かない）
* ルールを無効にするコメント（`eslint-disable`）は、`--report-unused-disable-directives` と、PR レビューで確認する。外部通信のルールを無効にすることは認めない

---

## 4. ビルド成果物の検査（出荷前に止める）

`scripts/check-dist.mjs` を CI の最後に実行し、次のどれかに当てはまれば失敗させる。

| # | 確認内容 | 理由 |
| :--- | :--- | :--- |
| 1 | `dist/_headers` が存在し、`connect-src 'none'` が含まれている。`dist/snap-redact/index.html` が存在する（出力先の設定漏れを検出） | CSP の設定漏れ・書き間違いを防ぐ |
| 2 | `dist/` の JS・CSS・HTML に、許可した URL 以外の `http://` / `https://` が含まれていない | 外部のスクリプト・画像・フォントの参照を防ぐ（T1, T2）。許可：`circle-note.com`、`github.com/digi-garden`、React などが埋め込むライセンス表記や仕様の URL（一覧はスクリプト内に持つ） |
| 3 | `dist/` 配下のすべての `.html`（本体は `dist/snap-redact/index.html`）にインラインの `<script>`（`src` のないもの）がない | CSP の `script-src 'self'` で動かなくなるのを事前に検出する |
| 4 | `dist/` に `data:` で始まるファイル埋め込みがない | `img-src 'self'` で表示されなくなるのを防ぐ |

* 3.1 の ESLint は自分のソースだけを見るが、こちらは依存ライブラリを含めた最終成果物を見る
* 依存ライブラリの中に `fetch` という文字列があっても、それだけでは失敗にしない（React 自体が含む場合がある）。実行時は CSP が止める

---

## 5. Cloudflare の設定

| 設定 | 値 | 理由 |
| :--- | :--- | :--- |
| Web Analytics（自動挿入） | 無効 | ページにスクリプトが差し込まれる（T3） |
| Rocket Loader | 無効 | スクリプトを書き換えて読み込む（T3） |
| Email Address Obfuscation | 無効 | スクリプトが差し込まれる（T3） |
| Zaraz・そのほかのスクリプト挿入機能 | 使わない | T3 |
| Always Use HTTPS | 有効 | ― |

* これらはドメイン（circle-note.com）単位の設定のため、既存2作と共通になる。既存2作の設定を確認し、そろえる
* 有効のままだと CSP で止められ、Console にエラーが出る（公開前セルフチェックで検出できる）

---

## 6. 依存ライブラリ（供給網）

| 対策 | 内容 |
| :--- | :--- |
| 最小化 | 実行時の依存は `react` と `react-dom` だけ（03 の 6.4） |
| 固定 | `package-lock.json` をコミットし、CI は `npm ci` で入れる |
| 更新 | Dependabot（npm と GitHub Actions、週1回）。更新の PR も CI（4章の検査を含む）を通ってからマージする |
| 監視 | Dependabot alerts を有効にする |
| GitHub Actions | 使う Action はバージョンをコミットの SHA で固定する |

---

## 7. リポジトリ（Public）

| 設定 | 内容 |
| :--- | :--- |
| Secret scanning ＋ push protection | 有効。トークンなどを含むコミットは push の時点で止まる |
| gitleaks | CI で毎回、履歴全体をスキャンする（05） |
| CodeQL | Default setup（JavaScript/TypeScript） |
| ルールセット（`main`） | 直接 push 禁止、PR 必須、CI 成功が必須、force push 禁止 |
| `.gitignore` | `.env*`、`dist/`、`node_modules/`、OS の不要ファイル |

* テスト用の画像（`src/**/__fixtures__/` など）には、本物の個人情報・社内画面を含めない。架空のデータで作る

---

## 8. 多層防御のまとめ（記事の図にする）

| 段 | いつ止めるか | 仕組み | 止めるもの |
| :--- | :--- | :--- | :--- |
| 1 | 書いたとき | ESLint（3章） | 自分のコードの通信・保存・遷移 |
| 2 | ビルドしたとき | `check-dist.mjs`（4章） | 外部 URL の参照、CSP の設定漏れ |
| 3 | 動いているとき | CSP（2章） | 依存ライブラリを含むすべての通信 |
| 4 | 利用者が確かめるとき | DevTools の手順（DL-02）、ソースの公開 | 「本当に送っていないか」の疑い |

---

## 9. 確認（06 テスト設計書へ引き継ぐ）

* 公開前セルフチェック：CSP のヘッダーが付いていること、Console で `fetch` がブロックされること、Network タブにページ本体以外の通信がないこと、Console に CSP 違反のエラーがないこと
* ESLint のルールが効いていることを確かめるテスト（禁止したコードを書いた検査用ファイルで ESLint がエラーになること。`window.location.href = …`、`document.location.href = …`、`location = …`、`self.fetch(…)`、`globalThis.open(…)`、`window["fetch"](…)` を含める）

---

## 10. 未決事項

| # | 内容 | いつ |
| :--- | :--- | :--- |
| 1 | Context-Packer の `_headers` との差分（本書は `img-src` を絞り、ヘッダーをいくつか追加している） | 初回の実装フェーズ |
| 2 | 既存2作の配信方式が 05 の 6.1 と異なる場合の、`_headers` のパスの見直し | 初回の実装フェーズ |
| 3 | Cloudflare のドメイン設定の現状（5章） | 初回のデプロイ前 |
