# 開発環境・CI/CD 設計書：Snap-Redact（MVP）v1.2

最終更新：2026-11-26 ／ 対象要件：`docs/requirements.md` v1.2（4章、6.4、8章） ／ 関連：`docs/03-architecture.md` v1.1、`docs/04-security-design.md` v1.1

* v1.0（2026-11-22）：初版
* v1.1（2026-11-22）：外部レビュー2回目を反映。8章に GitHub の設定手順を追加し、CodeQL の有効化を S1 の後に移した（出力先を `dist/snap-redact/` にしてプレビュー URL と本番のパスをそろえる、`_headers` の配置、型チェックを `tsc -p` 2回に変更、`vite preview` の CSP）

* v1.2（2026-11-26）：P4 の後に、WebKit（Safari 系）と Chromium で動かす E2E のワークフローを追加（2章、5.1、5.3）

基本設計の資料 5/6。手元の開発環境、ビルドの設定、CI、デプロイ、ブランチとリリースの運用を定める。

---

## 1. 開発環境

| 項目 | 内容 |
| :--- | :--- |
| Node.js | 実装開始時点の Active LTS。`.nvmrc` と `package.json` の `engines` に書く |
| パッケージ管理 | npm（`package-lock.json` をコミット） |
| エディタ | VS Code（推奨拡張：ESLint、Prettier、Tailwind CSS IntelliSense を `.vscode/extensions.json` に書く） |
| OS | Windows と macOS のどちらでも動くこと（パスの区切り・改行コードに依存しない）。改行は `.gitattributes` で LF に統一 |
| 確認用ブラウザ | Chrome、Edge、Firefox、Safari の最新版。Mac がないため、Safari 系は CI の WebKit（5.3）で毎回確かめ、本物の Safari は公開前に iPad・iPhone またはクラウドの実機サービスで一度確かめる |

---

## 2. npm スクリプト

| スクリプト | 内容 | 用途 |
| :--- | :--- | :--- |
| `dev` | `vite` | 開発サーバー（CSP ヘッダーは付かない） |
| `build` | `vite build && node scripts/copy-deploy-files.mjs` | 本番ビルド（本体は `dist/snap-redact/`、`_headers`・`_redirects` は `dist/` 直下） |
| `preview` | `vite preview` | ビルド結果の確認。`_headers` 相当のヘッダーを付けて CSP を確かめる（2.1） |
| `typecheck` | `tsc -p` を `tsconfig.app` / `core` / `node` / `e2e` の4つで実行 | 型チェック（`lib/core` は DOM なしの設定で別に検査する） |
| `lint` | `eslint . --max-warnings 0 --report-unused-disable-directives` | lint（警告も失敗扱い） |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` | 整形 |
| `test` | `vitest run` | 単体テスト |
| `check:dist` | `node scripts/check-dist.mjs` | ビルド成果物の検査（04 の 4章） |
| `test:e2e` | `playwright test` | ブラウザでの動作確認（5.3）。事前に `build` が必要。手元で Chrome を使うときは `CHROME_PATH` を指定し `--project=chromium` |
| `verify` | `typecheck` → `lint` → `format:check` → `test` → `build` → `check:dist` | CI と同じ確認を手元で一括実行 |

### 2.1 手元で CSP を確かめる

* `vite preview` に `preview.headers` で `_headers` と同じヘッダーを付ける（`vite.config.ts` で `deploy/_headers` を読み込んで設定する。値を二重に持たない）
* CSP には `upgrade-insecure-requests` を入れていないので（04 の 2.2）、LAN 内のスマホから PC の IP アドレスで開いても読み込みは失敗しない
* `vite preview` は `http://localhost:4173/snap-redact/` で開く
* 開発サーバー（`vite dev`）には付けない（Vite の開発用の仕組みがインラインスクリプトや WebSocket を使うため）

---

## 3. ビルドの設定（`vite.config.ts`）

| 設定 | 値 | 理由 |
| :--- | :--- | :--- |
| `base` | `'/snap-redact/'` | サブパスで配信する（6章） |
| `build.outDir` | `'dist/snap-redact'` | 成果物を `dist/snap-redact/` に出す。Pages のプロジェクトのルート（`dist/`）から見て `/snap-redact/` に置かれるので、**プレビュー URL でも本番でも同じパス**になり、`base` と `_headers` を切り替えずに済む（6.1） |
| `build.assetsInlineLimit` | `0` | 小さな画像・フォントを `data:` URI に埋め込ませない（04 の `img-src 'self'` と整合させる） |
| `build.sourcemap` | `true` | Public リポジトリなので隠す理由がなく、利用者がコードを確かめやすくなる（柱A） |
| `build.modulePreload.polyfill` | `false` | 対応ブラウザ（最新版のみ）は modulepreload に対応しているため不要。出力するコードを減らす |
| `build.target` | `'es2022'` | 対応ブラウザは最新版のみ |

* `_headers` と `_redirects` は Pages のプロジェクトのルート（`dist/` 直下）に置く必要がある。`public/` に置くと `dist/snap-redact/` にコピーされてしまうため、`deploy/_headers` と `deploy/_redirects` として別に持ち、ビルド後に `dist/` 直下へコピーする（`build` スクリプトの最後で `node scripts/copy-deploy-files.mjs`）
* `deploy/_redirects` には `/  /snap-redact/  302` を書き、プロジェクトのルートを開いたときにツールへ移動させる
* `index.html` にインラインの `<script>` や `<style>` を書かない

---

## 4. TypeScript・ESLint・Prettier

* tsconfig は3つに分け、`tsc -p` でそれぞれ検査する（Project References と `tsc -b` は使わない。`composite` などの設定が要らず、構成が単純になる）
  * `tsconfig.app.json`：`src/` 全体とテストファイル（`lib: ["ES2022", "DOM", "DOM.Iterable"]`、Vitest の型を含む）
  * `tsconfig.core.json`：`src/lib/core/` の本体だけ（`lib: ["ES2022"]`。DOM の型を使うとエラー、03 の 4章）。**`*.test.ts` は `exclude` する**（テストは Vitest や DOM の型を使うため、app 側で検査する）
  * `tsconfig.node.json`：`vite.config.ts`、`scripts/`、`eslint.config.js`
* ESLint：`typescript-eslint`（型情報を使う推奨設定）、`eslint-plugin-react-hooks`、04 の 3章の禁止ルール、03 の 4章の依存ルール（`no-restricted-imports`）
* Prettier：既存2作の設定に合わせる

---

## 5. CI（GitHub Actions）

### 5.1 ワークフロー

`.github/workflows/ci.yml`：`pull_request` と `main` への `push` で実行する。

| ジョブ | 手順 | ルールセットで必須にするか |
| :--- | :--- | :--- |
| `ci` | checkout → setup-node（`.nvmrc`、npm キャッシュ）→ `npm ci` → `typecheck` → `lint` → `format:check` → `test` → `build` → `check:dist` | 必須 |
| `secrets` | checkout（`fetch-depth: 0`、履歴全体）→ gitleaks CLI で `gitleaks detect` | 必須 |
| `e2e`（`e2e.yml`） | checkout → setup-node → `npm ci` → `build` → `playwright install --with-deps webkit chromium` → `test:e2e` | 安定して通ることを数回確かめてから必須にする（5.3） |

* gitleaks は公式の GitHub Action ではなく CLI を直接実行する（公式 Action は Organization のリポジトリでライセンスキーが必要なため）。CLI のバージョンは固定し、ダウンロードしたファイルのチェックサムを確かめる
* すべての Action はコミットの SHA で固定する（04 の 6章）
* `permissions: contents: read` を既定にし、必要以上の権限を与えない
* 所要時間の目安は数分以内。超える場合はキャッシュを見直す

### 5.2 CodeQL・Dependabot

* CodeQL：GitHub の Default setup を使う（ワークフローファイルは置かない）
* Dependabot：`.github/dependabot.yml` で `npm` と `github-actions` を週1回。開発用の依存はまとめて1つの PR にする（`groups`）

### 5.3 E2E（WebKit・Chromium）

* 目的：Mac がなくても、Safari 系（WebKit）の Canvas の描画と Pointer Events を PR ごとに確かめる。単体テスト（jsdom）では画素を見られないため、黒塗り・モザイクの結果の画素もここで確かめる
* 配信：本番と同じビルドを `vite preview` で配信する（`deploy/_headers` の CSP 付き）
* 内容（`e2e/`）
  * `editor.spec.ts`：ファイル選択で読み込み → 黒塗り（範囲が不透明の黒、文字の画素が残らない、元に戻すと元の画像と一致）、透過 PNG のモザイク（ブロックごとに単色、範囲の外に文字が残らない）、ドラッグ中の `Esc`、ダウンロード（ファイル名、画面と同じ画素、メタデータのチャンクがないこと。S11 で追加）
  * コピー（Chromium のみ）：ボタンと `Ctrl+C` で書き込みが成功し、TS-06 が出ること。WebKit の Playwright にはクリップボードへの書き込みの権限を与えられないため。ページからの読み出しは `Permissions-Policy` で止めているので、貼り付け先での表示は手で確かめる（P5 レビューで追加）
  * `security.spec.ts`：CSP（`connect-src 'none'`）が付くこと、同じオリジン以外へのリクエストがないこと、ページの中からの `fetch` が止められること
* クリップボード（貼り付け・コピー）は自動化しにくいため対象外。手動確認（06 の 4章）で確かめる
* Playwright の WebKit は Safari そのものではない（macOS・iOS の Safari と挙動が違う場合がある）。本物の Safari は公開前に一度確かめる

---

## 6. デプロイ（Cloudflare Pages）

| 項目 | 内容 |
| :--- | :--- |
| 連携 | Cloudflare Pages と GitHub リポジトリを連携する |
| ビルドコマンド | `npm run build`（依存は Pages が lockfile から自動で入れる） |
| 出力先 | `dist`（アプリ本体は `dist/snap-redact/`、`_headers`・`_redirects` は `dist/` 直下） |
| 本番 | `main` へのマージで自動デプロイ |
| プレビュー | PR ごとにプレビュー URL が発行される。手動確認は `https://<プレビューのホスト>/snap-redact/` で行う（本番と同じパス・同じヘッダー） |
| 環境変数 | なし（秘密情報を使わない）。Node は `.nvmrc` の 24 が使われる |
| プロジェクト名・URL | `snap-redact`・`https://snap-redact.pages.dev`（2026-11-24 作成） |

### 6.1 サブパス `/snap-redact/` での配信

本書の方式：**ツールごとに Pages プロジェクトを作り、成果物を `dist/snap-redact/` に出す**。

| 確認する場所 | URL | 配信されるもの |
| :--- | :--- | :--- |
| プレビュー | `https://<プレビューのホスト>/snap-redact/` | `dist/snap-redact/`、ヘッダーは `dist/_headers` の `/snap-redact/*` |
| Pages の本番ホスト | `https://<プロジェクト>.pages.dev/snap-redact/` | 同上 |
| 公開 URL | `https://circle-note.com/snap-redact/` | circle-note.com 側の振り分け（Worker やルーティング）が、パスを変えずに Pages の本番ホストへ渡す |

* `base`・出力先・`_headers` のパスがすべて `/snap-redact/` で一致するので、プレビュー URL で本番と同じ条件（CSP を含む）を確かめられる
* circle-note.com 側の振り分けが、Pages の応答ヘッダー（CSP など）を消したり書き換えたりしないことを確かめる（06 の MT-22 を公開 URL で行う）

**既存2作との突き合わせ（S3 で解消）**：circle-note.com はルーター Worker（`digi-garden/circle-note-router`）が、パスを変えずに（`rewrite: 'preserve'`）ツールごとの Pages へ振り分ける。Mask & Unmask も `/mask-unmask/` の下に出力する同じ方式で、本書の方式と一致している。

| 段階 | ルーターの設定 | 確認結果（2026-11-24） |
| :--- | :--- | :--- |
| Pages 単体 | ― | `/` → `/snap-redact/` の移動、CSP の `connect-src 'none'` が効くこと、通信がページ本体・JS・CSS だけであること |
| ステージング（`staging.circle-note.com`） | `SNAP_REDACT_ORIGIN=https://snap-redact.pages.dev` | `/snap-redact` → `/snap-redact/` の 308、ルーター経由でも CSP が届くこと、Cloudflare による差し込みがないこと |
| 本番（`circle-note.com`） | `DISABLED`（503・no-store） | v0.1.0 の公開時に有効化する（S14） |

## 7. ブランチ・コミット・リリース

### 7.1 ブランチ

| ブランチ | 用途 |
| :--- | :--- |
| `main` | 常にデプロイできる状態。直接 push しない（ルールセット） |
| `feat/<内容>` | 機能の追加（例：`feat/paste-input`） |
| `fix/<内容>` | 不具合の修正 |
| `docs/<内容>` | 資料だけの変更 |
| `chore/<内容>` | 設定・依存の更新 |

* 1つの作業（1.5時間）で1つの PR を目安にする

### 7.2 コミット・PR

* コミットメッセージは Conventional Commits（`feat:`、`fix:`、`docs:`、`chore:`、`test:`、`refactor:`）
* PR は Squash and merge。PR のタイトルが `main` のコミットメッセージになるので、Conventional Commits の形にする
* PR の説明には、関係する要件・機能の ID（`ED-5`、`F-06` など）と、手で確かめた内容を書く

### 7.3 リリース

1. 公開前セルフチェック（06）をプレビュー URL で行う
2. `main` にマージして本番にデプロイする
3. 本番 URL でセルフチェックの「外部通信」「CSP」の項目をもう一度行う
4. `main` の該当コミットにタグ `vX.Y.Z` を付け、GitHub Release を作る（変更点を箇条書き）

* 初回公開は `v0.1.0`。不具合の修正は `0.1.x`、機能の追加は `0.x.0`

---

## 8. リポジトリ作成直後にやること

### 8.1 チェックリスト

| # | 作業 | いつ | 担当 | 手順 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `digi-garden/snap-redact` を Public で作成 | P0 | 利用者 | 8.2 |
| 2 | Secret Protection（secret scanning）・push protection・Dependabot alerts を有効化 | P0 | 利用者 | 8.3 |
| 3 | マージ方法を Squash のみにし、マージ後のブランチ自動削除を有効化 | P0 | 利用者 | 8.4 |
| 4 | CodeQL の Default setup を有効化 | P0 | 利用者 | 8.5 |
| 5 | ルールセット（`main`）を設定 | P0 | 利用者 | 8.6 |
| 6 | 雛形（本書の設定一式、CI、`_headers`、`docs/`）の PR を作成 | S1〜S2 | Claude | ― |
| 7 | Cloudflare Pages と連携し、プレビュー URL を確認 | S3 | 利用者 | S3 で用意する |

* CodeQL（#4）は、対応言語のコードがまだなくても有効にできる。既定ブランチに TypeScript のコードが入った時点で、最初のスキャンが自動で行われる
* ルールセット（#5）の必須チェック `ci` と `secrets` は、CI が動く前でも名前を入力して追加できる。その場合、**最初の PR（S1）に CI のワークフローを含めないとマージできない**ので、S1 で CI を入れる（07 の S1）。ジョブ名は必須チェックの名前と完全に一致させる（`ci`、`secrets`）
* GitHub の画面の名前は変わることがある。手順どおりの名前が見つからない場合は、近い名前の項目を探すか、画面の内容を伝えてもらえれば Claude が案内する

### 8.2 リポジトリを作る（#1）

1. GitHub の digi-garden の Organization のページを開き、**Repositories** タブ → **New repository** をクリックする
2. 次のとおり入力する

| 項目 | 値 |
| :--- | :--- |
| Owner | `digi-garden` |
| Repository name | `snap-redact` |
| Description | `スクショを貼る前の5秒前処理。画像を外に送らず、ブラウザ内で黒塗り・モザイクする` |
| 公開範囲 | **Public** |
| Add a README file | **チェックする**（`main` ブランチを作っておくため。中身は S1 で書き直す） |
| Add .gitignore | なし（S1 で追加する） |
| Choose a license | Mask & Unmask と同じライセンスを選ぶ。迷う場合はなしにして、S1 で決める |

3. **Create repository** をクリックする

### 8.3 秘密情報の検出と依存の警告を有効にする（#2）

1. リポジトリのページで **Settings** タブを開く
2. 左のサイドバーを下にスクロールし、「Security and quality」の中にある **Advanced Security** をクリックする
3. 次の項目を、それぞれ右側の **Enable** で有効にする（Public リポジトリは最初から有効になっている項目もある。有効なら何もしない）

| 項目 | 場所 |
| :--- | :--- |
| Secret Protection | 「Secret Protection」の右側 |
| Push protection | 「Secret Protection」の中の「Push protection」の右側 |
| Dependabot alerts | 「Dependabot」の中の「Dependabot alerts」の右側 |

* Dependabot security updates（脆弱性の修正 PR を自動で作る機能）も有効にしてよい。バージョン更新の PR は S2 で入れる `dependabot.yml` で設定する

### 8.4 マージ方法を設定する（#3）

1. **Settings** タブ → 左のサイドバーの **General**（最初に開くページ）
2. 下にスクロールして「Pull Requests」の欄で、次のとおりにする

| 項目 | 設定 |
| :--- | :--- |
| Allow merge commits | **外す** |
| Allow squash merging | **チェックする**。その下の「Default commit message」は **Pull request title** を選ぶ（PR のタイトルが `main` のコミットメッセージになる、7.2） |
| Allow rebase merging | **外す** |
| Automatically delete head branches | **チェックする** |

* 変更はその場で保存される（保存ボタンはない）

### 8.5 CodeQL を有効にする（#4）

1. **Settings** → 左のサイドバーの「Security and quality」の中の **Advanced Security**
2. 「Code scanning」の中の「CodeQL analysis」の右側にある **Set up** → **Default** を選ぶ
3. **Enable CodeQL** をクリックする。コードがまだない段階では「No CodeQL supported languages to scan」と表示されるが、そのままでよい
4. S1 のマージ後に、**Actions** タブで CodeQL の最初のスキャンが成功したことを確かめる

### 8.6 ルールセットを設定する（#5）

1. **Settings** → 左のサイドバーの「Code, planning, and automation」の中にある **Rulesets**
2. **New ruleset** → **New branch ruleset** をクリックする
3. 次のとおり設定する

| 項目 | 設定 |
| :--- | :--- |
| Ruleset Name | `main` |
| Enforcement status | **Active** |
| Bypass list | 空のまま |
| Target branches | **Add target** → **Include default branch** |
| Restrict deletions | チェックする |
| Require a pull request before merging | チェックする。**Required approvals は 0** にする（1人開発のため。1以上にすると自分の PR をマージできなくなる）。その下の **Allowed merge methods は Squash だけ**にする |
| Require status checks to pass | チェックする。**Add checks** で `ci` と `secrets` を名前で入力して追加する（CI が動く前でも追加できる） |
| Block force pushes | チェックする |

4. **Create** をクリックする
5. 確かめ方：手元から `main` に直接 push しようとすると拒否されること

## 9. 未決事項

| # | 内容 | いつ |
| :--- | :--- | :--- |
| 1 | ~~既存2作の配信方式と、本書の方式（6.1）との差~~ → S3 で解消（6.1） | ― |
| 2 | 既存2作の Prettier・ESLint 設定との差分 | 初回の実装フェーズ |
| 3 | `vite preview` に `deploy/_headers` の内容を付ける実装方法（2.1） | 初回の実装フェーズ |
